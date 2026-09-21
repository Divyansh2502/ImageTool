export type ProcessingErrorCode =
  | "DECODE_FAILED"
  | "CANVAS_FAILED"
  | "ENCODE_FAILED"
  | "WORKER_FAILED"
  | "CANCELLED";

export type ProcessingError = {
  code: ProcessingErrorCode;
  stage: string;
  requestId?: number;
  targetBytes?: number;
  dimensions?: { width?: number; height?: number };
  outputType?: string;
};

export type ProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  type: string;
  minimumSize?: number;
  achieved?: boolean;
  requestId?: number;
  diagnostics?: unknown;
};

type BitmapFactory = () => Promise<ImageBitmap>;
type Operation = {
  requestId?: number;
  cancelled: boolean;
  worker?: Worker;
  rejectWorker?: (error: ProcessingError) => void;
};

let activeOperation: Operation | undefined;
let workerSequence = 0;
const isDevelopment = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

const cancelled = (requestId?: number): ProcessingError => ({ code: "CANCELLED", stage: "cancel", requestId });

function cancelOperation(operation: Operation) {
  if (operation.cancelled) return;
  operation.cancelled = true;
  if (operation.worker) {
    operation.worker.onmessage = null;
    operation.worker.onerror = null;
    operation.worker.terminate();
    operation.worker = undefined;
  }
  operation.rejectWorker?.(cancelled(operation.requestId));
  operation.rejectWorker = undefined;
}

export function cancelImageProcessing() {
  if (activeOperation) cancelOperation(activeOperation);
  activeOperation = undefined;
}

function runWorker(
  payload: Record<string, unknown>,
  operation: Operation,
  attempt: "file" | "bitmap",
  bitmap?: ImageBitmap,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    if (operation.cancelled || activeOperation !== operation) {
      bitmap?.close();
      reject(cancelled(operation.requestId));
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(new URL("../workers/image.worker.ts", import.meta.url));
    } catch {
      bitmap?.close();
      reject({ code: "WORKER_FAILED", stage: "worker", requestId: operation.requestId } satisfies ProcessingError);
      return;
    }

    const workerId = ++workerSequence;
    operation.worker = worker;
    operation.rejectWorker = reject;

    const finish = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      if (operation.worker === worker) operation.worker = undefined;
      operation.rejectWorker = undefined;
      if (isDevelopment) console.debug("compression worker terminated", { workerId, attempt, requestId: operation.requestId });
    };

    worker.onmessage = ({ data }) => {
      finish();
      if (operation.cancelled || activeOperation !== operation) {
        reject(cancelled(operation.requestId));
        return;
      }
      if (isDevelopment) console.debug(data.ok ? "compression worker result" : "compression worker error", data.ok ? data.diagnostics : data.error);
      data.ok ? resolve(data) : reject(data.error as ProcessingError);
    };
    worker.onerror = event => {
      finish();
      if (isDevelopment) console.error("compression worker runtime error", { workerId, attempt, requestId: operation.requestId, message: event.message });
      reject({ code: "WORKER_FAILED", stage: "worker", requestId: operation.requestId } satisfies ProcessingError);
    };

    const message = { ...payload, bitmap, decodeSource: attempt, workerId, development: isDevelopment };
    try {
      if (bitmap) worker.postMessage(message, [bitmap]);
      else worker.postMessage(message);
    } catch {
      finish();
      bitmap?.close();
      reject({ code: "WORKER_FAILED", stage: "communication", requestId: operation.requestId } satisfies ProcessingError);
      return;
    }

    if (isDevelopment) console.debug("compression worker created", { workerId, attempt, requestId: operation.requestId });
  });
}

export async function processInWorker(
  payload: Record<string, unknown>,
  createFallbackBitmap?: BitmapFactory,
): Promise<ProcessResult> {
  cancelImageProcessing();
  const operation: Operation = {
    requestId: payload.requestId as number | undefined,
    cancelled: false,
  };
  activeOperation = operation;

  try {
    try {
      return await runWorker(payload, operation, "file");
    } catch (failure) {
      const error = failure as ProcessingError;
      if (error.code !== "DECODE_FAILED" || !createFallbackBitmap) throw error;
      if (operation.cancelled || activeOperation !== operation) throw cancelled(operation.requestId);

      let bitmap: ImageBitmap;
      try {
        bitmap = await createFallbackBitmap();
      } catch (fallbackFailure) {
        const fallbackError = fallbackFailure as ProcessingError;
        if (fallbackError?.code === "CANCELLED") throw fallbackError;
        throw { ...error, stage: "main-thread-bitmap" } satisfies ProcessingError;
      }

      if (operation.cancelled || activeOperation !== operation) {
        bitmap.close();
        throw cancelled(operation.requestId);
      }

      const fallbackPayload = { ...payload, file: undefined };
      return await runWorker(fallbackPayload, operation, "bitmap", bitmap);
    }
  } finally {
    if (activeOperation === operation) activeOperation = undefined;
  }
}

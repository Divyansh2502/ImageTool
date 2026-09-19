export type ProcessResult = { blob: Blob; width: number; height: number; type: string };

export function processInWorker(payload: Record<string, unknown>): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/image.worker.ts", import.meta.url));
    worker.onmessage = ({ data }) => { worker.terminate(); data.ok ? resolve(data) : reject(new Error("processing")); };
    worker.onerror = () => { worker.terminate(); reject(new Error("processing")); };
    worker.postMessage(payload);
  });
}

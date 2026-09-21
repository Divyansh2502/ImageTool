type ImageTask = {
  file?: File;
  bitmap?: ImageBitmap;
  mode: "target" | "resize";
  targetBytes?: number;
  width?: number;
  height?: number;
  expectedWidth?: number;
  expectedHeight?: number;
  outputType?: string;
  sourceBytes?: number;
  requestId?: number;
  workerId?: number;
  decodeSource?: "file" | "bitmap";
  development?: boolean;
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImageTask>) => void) | null;
  postMessage: (message: unknown) => void;
};

const encode = (canvas: OffscreenCanvas, type: string, quality: number) =>
  canvas.convertToBlob({ type, quality });

workerScope.onmessage = async ({ data }) => {
  let stage = data.bitmap ? "bitmap" : "decode";
  const decodeStart = performance.now();
  let bitmap: ImageBitmap | undefined;

  try {
    bitmap = data.bitmap ?? await createImageBitmap(data.file!);
    const decodeEnd = performance.now();
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    if (
      data.expectedWidth && data.expectedHeight &&
      (originalWidth !== data.expectedWidth || originalHeight !== data.expectedHeight)
    ) throw new Error("BITMAP_DIMENSIONS_MISMATCH");

    stage = "canvas";
    if (typeof OffscreenCanvas === "undefined") throw new Error("OFFSCREEN_CANVAS_UNAVAILABLE");

    const width = data.mode === "resize" ? data.width! : originalWidth;
    const height = data.mode === "resize" ? data.height! : originalHeight;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = undefined;

    stage = "encode";
    const inputType = data.file?.type || data.outputType || "image/jpeg";
    const type = data.outputType || (inputType === "image/png" ? "image/webp" : inputType);
    const qualities: number[] = [];
    const sizes: number[] = [];
    let blob: Blob;
    let minimumSize: number | undefined;

    if (data.mode === "resize") {
      blob = await encode(canvas, type, 0.92);
    } else {
      const target = data.targetBytes!;
      const smallest = await encode(canvas, type, 0.05);
      minimumSize = smallest.size;
      let low = 0.05;
      let high = 0.98;
      let best: Blob | undefined;

      for (let index = 0; index < 9; index++) {
        const quality = (low + high) / 2;
        const candidate = await encode(canvas, type, quality);
        qualities.push(quality);
        sizes.push(candidate.size);
        if (candidate.size <= target) {
          best = candidate;
          low = quality;
        } else {
          high = quality;
        }
      }
      blob = best || smallest;
    }

    workerScope.postMessage({
      ok: true,
      blob,
      width,
      height,
      type,
      minimumSize,
      achieved: data.mode === "resize" || blob.size <= (data.targetBytes || Infinity),
      requestId: data.requestId,
      diagnostics: {
        workerId: data.workerId,
        decodeSource: data.decodeSource,
        decodeStart,
        decodeEnd,
        decodeDuration: decodeEnd - decodeStart,
        sourceBytes: data.sourceBytes ?? data.file?.size,
        targetBytes: data.targetBytes,
        width,
        height,
        outputType: type,
        attemptCount: qualities.length,
        qualities,
        sizes,
        selectedBytes: blob.size,
      },
    });
  } catch (error) {
    bitmap?.close();
    const code = stage === "decode" || stage === "bitmap"
      ? "DECODE_FAILED"
      : stage === "canvas"
        ? "CANVAS_FAILED"
        : "ENCODE_FAILED";
    if (data.development) console.warn("Image worker failed", stage, error);
    workerScope.postMessage({
      ok: false,
      requestId: data.requestId,
      error: {
        code,
        stage,
        requestId: data.requestId,
        targetBytes: data.targetBytes,
        dimensions: { width: data.expectedWidth, height: data.expectedHeight },
        outputType: data.outputType,
        workerId: data.workerId,
        errorName: error instanceof Error ? error.name : "Unknown",
      },
    });
  }
};

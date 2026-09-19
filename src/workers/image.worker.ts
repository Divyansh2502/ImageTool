type ImageTask = { file: File; mode: "target" | "resize"; targetBytes?: number; width?: number; height?: number; outputType?: string };
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImageTask>) => void) | null;
  postMessage: (message: unknown) => void;
};

async function encode(canvas: OffscreenCanvas, type: string, quality: number) {
  return canvas.convertToBlob({ type, quality });
}

workerScope.onmessage = async (event: MessageEvent<ImageTask>) => {
  try {
    const { file, mode } = event.data;
    const bitmap = await createImageBitmap(file);
    const width = mode === "resize" ? event.data.width! : bitmap.width;
    const height = mode === "resize" ? event.data.height! : bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { alpha: true })!;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const type = event.data.outputType || (file.type === "image/png" ? "image/webp" : file.type);
    let blob: Blob;
    if (mode === "resize") blob = await encode(canvas, type, 0.92);
    else {
      const target = event.data.targetBytes!;
      let low = 0.05, high = 0.98, best: Blob | undefined;
      for (let i = 0; i < 9; i++) {
        const quality = (low + high) / 2;
        const candidate = await encode(canvas, type, quality);
        if (candidate.size <= target) { best = candidate; low = quality; } else high = quality;
      }
      blob = best || await encode(canvas, type, 0.05);
    }
    workerScope.postMessage({ ok: true, blob, width, height, type });
  } catch { workerScope.postMessage({ ok: false }); }
};

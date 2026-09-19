export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_WIDTH = 8000;
export const MAX_HEIGHT = 8000;
export const MAX_PIXELS = 32_000_000;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageInfo = { width: number; height: number; url: string };

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes / 1024 ** 2 >= 10 ? 1 : 2)} MB`;
};

export async function validateImage(file: File): Promise<ImageInfo> {
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) throw new Error("invalid");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth > MAX_WIDTH || image.naturalHeight > MAX_HEIGHT || image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error("invalid");
    return { width: image.naturalWidth, height: image.naturalHeight, url };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("invalid");
  }
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

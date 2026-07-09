export function imageDataFromSource(
  source: CanvasImageSource,
  maxEdge?: number,
): { imageData: ImageData; scaled: boolean } {
  const canvas = document.createElement('canvas');
  let width = 0;
  let height = 0;

  if (source instanceof HTMLImageElement) {
    width = source.naturalWidth;
    height = source.naturalHeight;
  } else if (source instanceof HTMLCanvasElement) {
    width = source.width;
    height = source.height;
  } else if (source instanceof ImageBitmap) {
    width = source.width;
    height = source.height;
  } else {
    throw new Error('不支持的图片源');
  }

  let scaled = false;
  if (maxEdge && Math.max(width, height) > maxEdge) {
    const ratio = maxEdge / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    scaled = true;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, width, height);
  return { imageData: ctx.getImageData(0, 0, width, height), scaled };
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);
  return canvas;
}

export function imageDataToObjectUrl(imageData: ImageData, mime = 'image/png'): string {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL(mime);
}

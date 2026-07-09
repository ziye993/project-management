import type { ImageCryptoSettings } from '@/type/imageCryptoSettings';

export function drawVerticalWatermark(
  ctx: CanvasRenderingContext2D,
  settings: Pick<
    ImageCryptoSettings,
    | 'mirageWatermarkText'
    | 'mirageWatermarkFontSize'
    | 'mirageWatermarkOffsetX'
    | 'mirageWatermarkOffsetY'
    | 'mirageWatermarkColor'
    | 'mirageWatermarkStroke'
  >,
): void {
  const text = settings.mirageWatermarkText || '隐写图';
  const chars = [...text];
  const fontSize = settings.mirageWatermarkFontSize;
  const offsetX = settings.mirageWatermarkOffsetX;
  const offsetY = settings.mirageWatermarkOffsetY;
  const canvas = ctx.canvas;

  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 1;

  const lineHeight = fontSize + 2;
  const totalHeight = chars.length * lineHeight;
  let y = canvas.height - offsetY;

  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i]!;
    ctx.strokeStyle = settings.mirageWatermarkStroke;
    ctx.fillStyle = settings.mirageWatermarkColor;
    const x = canvas.width - offsetX;
    ctx.strokeText(ch, x, y);
    ctx.fillText(ch, x, y);
    y -= lineHeight;
  }

  if (totalHeight > canvas.height) {
    // noop — watermark may clip on tiny images
  }
  ctx.restore();
}

export function applyMirageWatermark(
  imageData: ImageData,
  settings: ImageCryptoSettings,
): ImageData {
  if (!settings.mirageWatermarkEnabled) return imageData;
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  drawVerticalWatermark(ctx, settings);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

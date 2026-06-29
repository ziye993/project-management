import { getTheme } from '../themes';
import type { TConfigRef, TEleType } from '../themes/types';

const eleBg: Partial<Record<TEleType, CanvasImageSource>> = {};
let activeThemeId = 'rect';
const lightColor = '#6eb279';

export function setCurrentTheme(themeId: string) {
  activeThemeId = themeId;
  loadThemeAssets(themeId);
}

async function loadThemeAssets(themeId: string) {
  const theme = getTheme(themeId);
  if (theme.renderMode !== 'image' || !theme.assets) return;

  const entries = Object.entries(theme.assets) as [TEleType, string][];
  await Promise.all(
    entries.map(([key, url]) =>
      loadImage(url).then(img => {
        eleBg[key] = img;
      }),
    ),
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

// 预加载默认主题资源
loadThemeAssets('rect');
loadThemeAssets('image');

export type { TConfigRef };

export const clearConfigRect = <T>(
  _configs: TConfigRef<T>[] | TConfigRef<T>,
  ctx: CanvasRenderingContext2D,
) => {
  const configs = Array.isArray(_configs) ? _configs : [_configs];
  if (!configs.length) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  configs.forEach(c => {
    if (!c) return;
    const x = c.position?.x ?? 0;
    const y = c.position?.y ?? 0;
    const w = c.width ?? 0;
    const h = c.height ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });
  ctx.clearRect(minX, minY, maxX - minX, maxY - minY);
};

function drawTextContent(
  ctx: CanvasRenderingContext2D,
  config: TConfigRef,
  x: number,
  y: number,
) {
  const { width = 100, height = 50, textColor, texts = [], content } = config;
  if (!content) return;
  ctx.fillStyle = textColor || '#FFF';
  ctx.font = '16px sans-serif';

  if (height > width) {
    let currentY = y + height / 2 - content.length * 8;
    for (let i = 0; i < content.length; i++) {
      ctx.fillText(content[i], x + width / 2 - 8, currentY);
      currentY += 20;
    }
  } else {
    const textWidth = ctx.measureText(content).width;
    ctx.fillText(content, x + width / 2 - textWidth / 2, y + height / 2 + 5);
  }

  texts?.forEach(t => {
    const tx = (t.position?.x ?? 0) + x;
    const ty = (t.position?.y ?? 0) + y;
    ctx.font = `${t.size || 14}px sans-serif`;
    ctx.fillStyle = t.color || '#FFF';
    if (t.direction === 'vertical') {
      let offset = 0;
      for (const char of t.content || '') {
        ctx.fillText(char, tx, ty + offset * t.size);
        offset++;
      }
    } else {
      ctx.fillText(t.content || '', tx, ty);
    }
  });
}

function drawRoundedImageWithTexts(ctx: CanvasRenderingContext2D, config: TConfigRef) {
  const { width = 100, height = 50, position = {}, eleType } = config;
  const x = position.x ?? 0;
  const y = position.y ?? 0;
  const bg = eleType ? eleBg[eleType] : undefined;

  if (bg) {
    ctx.drawImage(bg, x, y, width, height);
    drawTextContent(ctx, config, x, y);
  } else {
    drawRoundedRectWithTexts(ctx, config);
  }
}

function drawRoundedRectWithTexts(ctx: CanvasRenderingContext2D, config: TConfigRef) {
  const {
    width = 100,
    height = 50,
    background = '#ccc',
    borderRadius = 0,
    position = {},
    type = 'box',
    eleType = '',
  } = config;
  const x = position.x ?? 0;
  const y = position.y ?? 0;

  if (type === 'box') {
    const r = typeof borderRadius === 'number' ? borderRadius : parseInt(String(borderRadius), 10) || 0;
    const radius = Math.min(r, width / 2, height / 2);
    ctx.fillStyle = String(eleType).includes('light') ? lightColor : background;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
  drawTextContent(ctx, config, x, y);
}

export const renderToConfig = <T>(
  configs: TConfigRef<T> | TConfigRef<T>[],
  ctx: CanvasRenderingContext2D,
) => {
  const theme = getTheme(activeThemeId);
  const draw = theme.renderMode === 'image' ? drawRoundedImageWithTexts : drawRoundedRectWithTexts;
  const arr = Array.isArray(configs) ? configs : [configs];
  arr.forEach(c => draw(ctx, c));
};

export const renderToChangeConfig = <T>(
  config: TConfigRef<T> | TConfigRef<T>[],
  ctx: CanvasRenderingContext2D,
  lastConfig: TConfigRef<T> | TConfigRef<T>[],
) => {
  clearConfigRect(lastConfig, ctx);
  renderToConfig(config, ctx);
};

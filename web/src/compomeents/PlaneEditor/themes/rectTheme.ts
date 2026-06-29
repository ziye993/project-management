import type { PlaneTheme } from './types';

/** 纯色圆角矩形主题 — 替换图片路径即可切换为图片主题 */
export const rectTheme: PlaneTheme = {
  id: 'rect',
  label: '纯色主题',
  renderMode: 'rect',
  showBackgroundFrame: false,
  pageDefaults: {
    canvasBackground: 'rgb(1,42,116)',
    devBoxDefaultBackground: '#354866',
    siteBoxDefaultBackground: '#3d5a4a',
    textDefaultBackground: '#354866',
  },
};

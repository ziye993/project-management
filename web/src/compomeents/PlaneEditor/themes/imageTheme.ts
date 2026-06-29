import type { PlaneTheme } from './types';
import devBg from './assets/devBg.svg';
import siteBg from './assets/siteBg.svg';
import lineBg from './assets/lineBg.svg';

/**
 * 图片背景主题 — 替换 assets 下的 svg/png 即可定制外观
 * 也可直接修改 assets 对象中的 import 路径
 */
export const imageTheme: PlaneTheme = {
  id: 'image',
  label: '图片主题',
  renderMode: 'image',
  showBackgroundFrame: true,
  title: '平面布局编辑器',
  pageDefaults: {
    canvasBackground: 'transparent',
    devBoxDefaultBackground: '',
    siteBoxDefaultBackground: '',
    textDefaultBackground: '',
  },
  assets: {
    dev: devBg,
    site: siteBg,
    line: lineBg,
    'light-dev': devBg,
    'light-site': siteBg,
  },
};

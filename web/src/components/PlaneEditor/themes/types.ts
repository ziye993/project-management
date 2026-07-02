export type TEleType =
  | 'dev'
  | 'site'
  | 'line'
  | 'text'
  | 'light-dev'
  | 'light-site'
  | 'light-line'
  | 'light-text';

export type TRenderMode = 'rect' | 'image';

export interface PlaneThemeAssets {
  dev?: string;
  site?: string;
  line?: string;
  'light-dev'?: string;
  'light-site'?: string;
}

export interface PlaneThemePageDefaults {
  canvasBackground: string;
  devBoxDefaultBackground: string;
  siteBoxDefaultBackground: string;
  textDefaultBackground: string;
}

export interface PlaneTheme {
  id: string;
  label: string;
  renderMode: TRenderMode;
  pageDefaults: PlaneThemePageDefaults;
  /** 是否显示装饰性外框与标题 */
  showBackgroundFrame?: boolean;
  title?: string;
  assets?: PlaneThemeAssets;
}

export type TConfigRef<T = object> = {
  index?: number;
  parentId?: string | number;
  parentIndex?: number;
  id?: string | number;
  width?: number;
  height?: number;
  content?: string;
  textColor?: string;
  type?: 'box' | 'text';
  eleType?: TEleType;
  key?: string;
  position?: {
    x?: number;
    y?: number;
    zIndex?: number;
  };
  borderRadius?: number | string;
  background?: string;
  texts?: {
    parentId?: string | number;
    index: number;
    id?: string | number;
    size: number;
    type?: 'box' | 'text';
    position?: {
      x?: number;
      y?: number;
      zIndex?: number;
    };
    direction?: 'vertical' | 'level';
    content?: string;
    color?: string;
  }[];
  children?: TConfigRef<T>[];
  childrenIds?: (string | number)[];
} & T;

export enum EViewDatatype {
  INS = 'ins',
  NES = 'nes',
}

export interface PlanePageConfig {
  theme: string;
  width: number;
  height: number;
  canvasBackground: string;
  devBoxDefaultBackground: string;
  siteBoxDefaultBackground: string;
  textDefaultBackground: string;
  seedId?: number;
}

export interface PlaneSavedData {
  seedId: number;
  theme: string;
  width: number;
  height: number;
  canvasBackground: string;
  devBoxDefaultBackground: string;
  siteBoxDefaultBackground: string;
  textDefaultBackground: string;
  data: TConfigRef[];
}

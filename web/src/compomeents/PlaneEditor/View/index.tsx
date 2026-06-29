import { forwardRef, useImperativeHandle, useRef, useEffect, type Ref, type ForwardedRef } from 'react';
import styles from '../index.module.less';
import { clearConfigRect, renderToChangeConfig, renderToConfig, type TConfigRef } from './render';
import { EViewDatatype } from '../themes/types';

const mockData: TConfigRef[] = [];

type TInspectionConfigArg<T> = (arg: TConfigRef<T>[], parent?: TConfigRef<T>) => TConfigRef<T>[];

const defaultConfig = {
  width: 200,
  height: 50,
  background: '#354866',
  borderRadius: 5,
};

export interface IViewRef<T = object> {
  getPosition: () => { x: number; y: number };
  startChangeElement: (id: number | string | TConfigRef) => void;
  changeElement: (config: TConfigRef | TConfigRef[]) => void;
  endChangeElement: () => void;
  addElement: (config?: TConfigRef<T>) => TConfigRef<T>;
  setSize: (width: number, height: number) => void;
  getElementConfig: (id?: number | string, type?: EViewDatatype) => TConfigRef<T>[] | TConfigRef<T> | undefined;
  updataElement: (config: TConfigRef<T>) => TConfigRef<T>;
  deleteElement?: (config?: TConfigRef<T>) => boolean;
  initRender?: (config?: TConfigRef<T> | TConfigRef<T>[]) => void;
  refresh?: () => void;
  getSeedId?: () => number;
}

function pointInConfig(p: { x: number; y: number }, c: TConfigRef): boolean {
  const px = c.position?.x ?? 0;
  const py = c.position?.y ?? 0;
  return p.x >= px && p.x <= px + c.width! && p.y >= py && p.y <= py + c.height!;
}

interface IProps<T = object> {
  onEleClick?: (e: React.MouseEvent<HTMLCanvasElement>, ele: TConfigRef<T>) => void;
  onEleMove?: (e: React.MouseEvent<HTMLCanvasElement>, ele: TConfigRef<T>) => void;
  resize?: number;
  style: React.CSSProperties;
  seedId: number;
}

const getSetId = (seed: number, option?: { spacing: number }) => {
  let eleId = seed + 1;
  return {
    useNextId: () => {
      eleId += option?.spacing ?? 1;
      return Number(String(eleId));
    },
    getCurrrentId: () => eleId,
  };
};

function ViewInner<T = object>(props: IProps<T>, ref: Ref<IViewRef<T>>) {
  const viewRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<TConfigRef<T>[]>(mockData as TConfigRef<T>[]);
  const canvasFixedRef = useRef<HTMLCanvasElement>(null);
  const canvasFixedContext = useRef<CanvasRenderingContext2D | null>(null);
  const fixedConfig = useRef<(TConfigRef<T> & { children?: TConfigRef<T>[] })[]>([]);
  const canvasChangeRef = useRef<HTMLCanvasElement>(null);
  const canvasChangeContext = useRef<CanvasRenderingContext2D | null>(null);
  const changeConfig = useRef<TConfigRef<T>[]>([]);
  const idGenerator = useRef(getSetId(props.seedId));
  const sustainRender = useRef(false);

  const inspectionConfig: TInspectionConfigArg<T> = (_configs, parentConfig) => {
    const configs: TConfigRef<T>[] = [];
    _configs.forEach(item => {
      configs.push({
        ...item,
        children: undefined,
        childrenIds: item.childrenIds?.length
          ? item.childrenIds
          : item.children?.map(c => c?.id) || [],
        parentId: parentConfig?.id || item.parentId,
        parentIndex: parentConfig?.index ?? item.parentIndex,
      });
      if (item.children) {
        configs.push(...inspectionConfig(item.children, item));
      }
    });
    return configs.filter(Boolean);
  };

  function nestingConfig(configs?: TConfigRef<T>[]): TConfigRef<T>[] {
    if (!configs?.length) return [];
    const list = configs.map(item => ({ ...item }));
    const map = new Map<string | number, TConfigRef<T>>();
    list.forEach(item => {
      if (item.id !== undefined) {
        item.children = [];
        map.set(item.id, item);
      }
    });
    const roots: TConfigRef<T>[] = [];
    list.forEach(item => {
      const { parentId } = item;
      if (parentId !== undefined && map.has(parentId)) {
        map.get(parentId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    });
    return roots.filter(Boolean);
  }

  const renderFixedLayer = () => {
    canvasFixedContext.current?.clearRect(
      0, 0,
      canvasFixedRef.current?.width ?? 0,
      canvasFixedRef.current?.height ?? 0,
    );
    canvasChangeContext.current?.clearRect(
      0, 0,
      canvasChangeRef.current?.width ?? 0,
      canvasChangeRef.current?.height ?? 0,
    );
    fixedConfig.current.forEach(c => renderToConfig(c, canvasFixedContext.current!));
  };

  const startSustainRender = () => {
    let lastConfigs: TConfigRef<T>[] | null = null;
    const changeCanvasRender = () => {
      if (!changeConfig.current.length) {
        sustainRender.current = false;
        return;
      }
      renderToChangeConfig(changeConfig.current, canvasChangeContext.current!, lastConfigs!);
      lastConfigs = [...changeConfig.current];
      if (sustainRender.current) {
        requestAnimationFrame(() => {
          renderFixedLayer();
          changeCanvasRender();
        });
      }
    };
    changeCanvasRender();
  };

  const startChangeElement = (idOrEle: number | string | TConfigRef) => {
    const el =
      typeof idOrEle === 'object'
        ? idOrEle
        : fixedConfig.current.find(c => c?.id === idOrEle);
    if (!el) return;
    const { origin, select } = fixedConfig.current.reduce(
      (prev, item) => {
        if (el.id === item.id || el.childrenIds?.includes?.(item.id!)) {
          prev.select.push(item);
        } else {
          prev.origin.push(item);
        }
        return prev;
      },
      { origin: [] as typeof fixedConfig.current, select: [] as typeof fixedConfig.current },
    );
    changeConfig.current = JSON.parse(JSON.stringify(select));
    fixedConfig.current = origin;
    sustainRender.current = true;
    renderFixedLayer();
    startSustainRender();
  };

  const changeElement = (config: TConfigRef | TConfigRef[]) => {
    const configs = Array.isArray(config) ? config : [config];
    if (configs.length) changeConfig.current = configs as TConfigRef<T>[];
  };

  const endChangeElement = () => {
    const clearList: TConfigRef<T>[] = [];
    changeConfig.current.forEach(element => {
      fixedConfig.current.push(element);
      clearList.push(element);
    });
    sustainRender.current = false;
    if (!clearList.length) return;
    clearConfigRect(clearList, canvasChangeContext.current!);
    renderFixedLayer();
    configRef.current = nestingConfig(fixedConfig.current);
    changeConfig.current = [];
  };

  const setSize = (width: number, height: number) => {
    if (canvasFixedRef.current) {
      canvasFixedRef.current.width = width;
      canvasFixedRef.current.height = height;
    }
    if (canvasChangeRef.current) {
      canvasChangeRef.current.width = width;
      canvasChangeRef.current.height = height;
    }
    renderFixedLayer();
  };

  const initCanvas = () => {
    if (!viewRef.current || !canvasFixedRef.current || !canvasChangeRef.current) return false;
    const { width, height } = viewRef.current.getBoundingClientRect();
    setSize(width, height);
    canvasFixedContext.current = canvasFixedRef.current.getContext('2d');
    canvasChangeContext.current = canvasChangeRef.current.getContext('2d');
    renderFixedLayer();
    return true;
  };

  const init = () => {
    configRef.current = nestingConfig(fixedConfig.current);
    initCanvas();
  };

  const completeConfig = (config: TConfigRef<T>): TConfigRef<T> => {
    let id: string | number;
    if (config?.id) id = config.id;
    else if (config?.parentId) id = `${config.parentId}-e${idGenerator.current.useNextId()}`;
    else id = `e${idGenerator.current.useNextId()}`;
    return {
      ...defaultConfig,
      ...config,
      id,
      index: fixedConfig.current?.length,
      children: config?.children?.length ? config.children.map(c => completeConfig(c)) : [],
    };
  };

  const addElement = (config: TConfigRef<T> = {} as TConfigRef<T>): TConfigRef<T> => {
    const parentConfig = config?.parentId
      ? (getElementConfig(config.parentId) as TConfigRef<T>)
      : undefined;
    const newConfig = completeConfig(config);
    const newPlane = inspectionConfig([newConfig], parentConfig);
    if (parentConfig) {
      updataElement({
        ...parentConfig,
        childrenIds: [...(parentConfig.childrenIds || []), newConfig.id!],
      });
    }
    fixedConfig.current.push(...newPlane);
    configRef.current = nestingConfig(fixedConfig.current);
    renderFixedLayer();
    return newConfig;
  };

  const updataElement = (config: TConfigRef<T>) => {
    fixedConfig.current = fixedConfig.current.map(item => {
      if (item.id === config.id) return config;
      if (item.id === config.parentId) {
        return { ...item, childrenIds: [...(item.childrenIds || []), config.id!] };
      }
      if (item.childrenIds?.includes(config.id!) && !config.parentId) {
        return { ...item, childrenIds: item.childrenIds.filter(c => c !== config.id) };
      }
      return item;
    });
    configRef.current = nestingConfig(fixedConfig.current);
    renderFixedLayer();
    return config;
  };

  const deleteElement = (config?: TConfigRef<T>): boolean => {
    const idx = fixedConfig.current.findIndex(c => c.id === config?.id);
    if (idx > -1) {
      fixedConfig.current.splice(idx, 1);
      configRef.current = nestingConfig(fixedConfig.current);
      renderFixedLayer();
      return true;
    }
    return false;
  };

  const getElementConfig = (id?: number | string, type?: EViewDatatype) => {
    if (id) return inspectionConfig(configRef.current)?.find(c => c.id === id);
    if (type === EViewDatatype.INS) return inspectionConfig(configRef.current);
    if (type === EViewDatatype.NES) return nestingConfig(fixedConfig.current);
  };

  useEffect(() => { init(); }, []);

  useEffect(() => {
    let isDown = false;
    let startX = 0;
    let startY = 0;
    const canvas = canvasChangeRef.current;
    if (!canvas) return;
    let movEle: TConfigRef<T> | null = null;
    let differences: { x: number; y: number }[] = [];

    const mousedown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      isDown = true;
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      movEle = fixedConfig.current.find(c => pointInConfig({ x: startX, y: startY }, c)) ?? null;
      if (!movEle) {
        isDown = false;
        return;
      }
      startChangeElement(movEle.id!);
      differences = changeConfig.current.map(c => ({
        x: startX - (c.position?.x ?? 0),
        y: startY - (c.position?.y ?? 0),
      }));
    };

    const mousemove = (e: MouseEvent) => {
      if (!isDown || !movEle) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      changeConfig.current.forEach((c, i) => {
        c.position = { ...c.position, x: x - differences[i].x, y: y - differences[i].y };
      });
      props.onEleMove?.(e as unknown as React.MouseEvent<HTMLCanvasElement>, movEle);
    };

    const mouseup = (e: MouseEvent) => {
      props.onEleClick?.(e as unknown as React.MouseEvent<HTMLCanvasElement>, movEle!);
      isDown = false;
      movEle = null;
      endChangeElement();
    };

    const mouseleave = () => {
      isDown = false;
      movEle = null;
      endChangeElement();
    };

    canvas.addEventListener('mousedown', mousedown);
    canvas.addEventListener('mousemove', mousemove);
    canvas.addEventListener('mouseup', mouseup);
    canvas.addEventListener('mouseleave', mouseleave);
    return () => {
      canvas.removeEventListener('mousedown', mousedown);
      canvas.removeEventListener('mousemove', mousemove);
      canvas.removeEventListener('mouseup', mouseup);
      canvas.removeEventListener('mouseleave', mouseleave);
    };
  }, [props.resize]);

  useEffect(() => {
    idGenerator.current = getSetId(props.seedId);
  }, [props.seedId]);

  useImperativeHandle(ref, () => ({
    getPosition: () => {
      const rect = canvasFixedRef.current?.getBoundingClientRect();
      return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
    },
    startChangeElement,
    changeElement,
    endChangeElement,
    addElement,
    updataElement,
    setSize,
    deleteElement,
    getElementConfig,
    initRender(configs) {
      if (!configs) return;
      fixedConfig.current = Array.isArray(configs) ? configs : [configs];
      init();
    },
    refresh() { renderFixedLayer(); },
    getSeedId: () => idGenerator.current.getCurrrentId(),
  }));

  if (!props.seedId) return null;

  return (
    <div className={styles.viewBox} ref={viewRef} style={props.style}>
      <canvas ref={canvasFixedRef} className={styles.canvasPlane} width={0} height={0} />
      <canvas ref={canvasChangeRef} className={styles.canvasChange} width={0} height={0} />
    </div>
  );
}

const View = forwardRef(ViewInner) as <T = object>(
  props: IProps<T> & { ref?: ForwardedRef<IViewRef<T>> },
) => React.ReactElement;

export default View;

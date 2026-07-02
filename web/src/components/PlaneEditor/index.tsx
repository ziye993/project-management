import styles from './index.module.less';
import { useRef, useState, useEffect, useCallback } from 'react';
import message from '@/components/ui/Modal/message';
import CanvasConfig from './CanvasConfig';
import ComponentsList from './ComponentsList';
import DevSetting, { type ElementConfig } from './DevSetting';
import View, { type IViewRef } from './View';
import { setCurrentTheme } from './View/render';
import Background from './Background';
import { EViewDatatype } from './themes/types';
import type { PlanePageConfig, TConfigRef } from './themes/types';
import { getTheme } from './themes';
import { loadPlaneConfig, savePlaneConfig, mockDevices } from './mock';

export type TConfigSelf = ElementConfig;

export default function PlaneEditor() {
  const comRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<IViewRef<TConfigSelf>>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const devSettingRef = useRef<{ update: (ele: TConfigSelf) => void }>(null);
  const [resize, setResize] = useState(0);
  const [currentConfig, setCurrentConfig] = useState<TConfigSelf | null>(null);
  const [availableDevices, setAvailableDevices] = useState(mockDevices);
  const [viewSeedId, setViewSeedId] = useState(1);
  const [pageConfig, setPageConfig] = useState<PlanePageConfig>({
    theme: 'rect',
    width: 1920,
    height: 1080,
    canvasBackground: 'rgb(1,42,116)',
    devBoxDefaultBackground: '#354866',
    siteBoxDefaultBackground: '#3d5a4a',
    textDefaultBackground: '#354866',
  });
  const [ready, setReady] = useState(false);

  const getConfig = useCallback((type: EViewDatatype) => {
    const arr = viewRef.current?.getElementConfig(undefined, type);
    if (Array.isArray(arr)) return arr;
    return arr ? [arr] : [];
  }, []);

  const hasElement = useCallback((ele: TConfigRef | string | number) => {
    const list = getConfig(EViewDatatype.INS).map(c => c.key).filter(Boolean);
    const id = typeof ele === 'object' ? ele.key : ele;
    return list.indexOf(String(id)) > -1;
  }, [getConfig]);

  const refreshDeviceList = useCallback(() => {
    setAvailableDevices(mockDevices.filter(d => !hasElement(d.value)));
  }, [hasElement]);

  const applySavedData = useCallback((saved: Awaited<ReturnType<typeof loadPlaneConfig>>) => {
    const {
      seedId,
      theme,
      width,
      height,
      canvasBackground,
      devBoxDefaultBackground,
      siteBoxDefaultBackground,
      textDefaultBackground,
      data,
    } = saved;
    setViewSeedId(seedId ?? 1);
    const cfg: PlanePageConfig = {
      theme,
      width,
      height,
      canvasBackground,
      devBoxDefaultBackground,
      siteBoxDefaultBackground,
      textDefaultBackground,
    };
    setPageConfig(cfg);
    setCurrentTheme(theme);
    setTimeout(() => {
      viewRef.current?.initRender?.(data || []);
      if (width > 0 && height > 0) {
        viewRef.current?.setSize?.(width, height);
      }
      refreshDeviceList();
    }, 0);
  }, [refreshDeviceList]);

  useEffect(() => {
    loadPlaneConfig().then(saved => {
      applySavedData(saved);
      setReady(true);
    });
  }, [applySavedData]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setResize(v => v + 1), 100);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!ready || !comRef.current) return;

    const bindDrag = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      let config: TConfigSelf;
      let originX = 0;
      let originY = 0;

      const dragStart = (e: DragEvent) => {
        const pos = viewRef.current?.getPosition() ?? { x: 0, y: 0 };
        originX = pos.x;
        originY = pos.y;
        let dataParam: Record<string, unknown> = {};
        try {
          dataParam = JSON.parse((e.target as HTMLDivElement)?.dataset?.json || '{}');
        } catch { /* ignore */ }
        const { label, value, parentid, parentindex, type, eletype, width, height } = dataParam;
        config = viewRef.current!.addElement({
          content: label as string,
          key: value as string,
          parentId: parentid as string | number,
          eleType: (eletype as TConfigRef['eleType']) || 'ele',
          parentIndex: Number(parentindex) || undefined,
          position: { x: -1000, y: -1000 },
          type: type === 'box' ? 'box' : 'text',
          ...(Number(width) && Number(height) ? { width: Number(width), height: Number(height) } : {}),
        } as TConfigSelf);
        viewRef.current?.startChangeElement(config.id!);
      };

      const drag = (e: DragEvent) => {
        if (e.clientX <= 0 && e.clientY <= 0 || !config) return;
        const mx = e.clientX - originX - (config.width || 0) / 2;
        const my = e.clientY - originY - (config.height || 0) / 2;
        viewRef.current?.changeElement([{
          ...config,
          position: { ...config.position, x: mx, y: my },
        }]);
      };

      const dragEnd = () => {
        viewRef.current?.endChangeElement();
        refreshDeviceList();
      };

      el.addEventListener('dragstart', dragStart);
      el.addEventListener('drag', drag);
      el.addEventListener('dragend', dragEnd);
      return () => {
        el.removeEventListener('dragstart', dragStart);
        el.removeEventListener('drag', drag);
        el.removeEventListener('dragend', dragEnd);
      };
    };

    const unbindCom = bindDrag(comRef.current);
    const unbindSite = bindDrag(siteRef.current);
    return () => {
      unbindCom();
      unbindSite();
    };
  }, [resize, ready, refreshDeviceList]);

  const handleSave = async () => {
    const payload = {
      seedId: viewRef.current?.getSeedId?.() ?? viewSeedId,
      theme: pageConfig.theme,
      width: pageConfig.width,
      height: pageConfig.height,
      canvasBackground: pageConfig.canvasBackground,
      devBoxDefaultBackground: pageConfig.devBoxDefaultBackground,
      siteBoxDefaultBackground: pageConfig.siteBoxDefaultBackground,
      textDefaultBackground: pageConfig.textDefaultBackground,
      data: getConfig(EViewDatatype.INS),
    };
    const { success } = await savePlaneConfig(payload);
    if (success) message.success('已保存到本地');
  };

  const handlePageConfigChange = async (value: Partial<PlanePageConfig>) => {
    const data = getConfig(EViewDatatype.INS);
    const next = { ...pageConfig, ...value };
    setPageConfig(next);
    setCurrentTheme(next.theme || 'rect');
    viewRef.current?.initRender?.(data);
    if ((value.width ?? 0) > 0 && (value.height ?? 0) > 0) {
      viewRef.current?.setSize?.(value.width!, value.height!);
    }
  };

  const theme = getTheme(pageConfig.theme);
  const canvasStyle: React.CSSProperties = {
    background: pageConfig.canvasBackground || 'rgb(1,42,116)',
    width: pageConfig.width,
    height: pageConfig.height,
  };

  if (!ready) return null;

  return (
    <div className={styles.box}>
      <div className={styles.config}>
        <CanvasConfig
          pageConfig={pageConfig}
          onChange={handlePageConfigChange}
          getConfig={getConfig}
          saveData={handleSave}
        />
      </div>
      <div className={styles.view}>
        <ComponentsList
          componentsRef={comRef}
          deviceList={availableDevices}
          hasElement={hasElement}
        />
        <div className={styles.scorl}>
          <Background
            themeId={pageConfig.theme}
            title={theme.title}
            style={canvasStyle}
          >
            <View<TConfigSelf>
              style={canvasStyle}
              ref={viewRef}
              resize={resize}
              seedId={viewSeedId}
              onEleClick={(_, ele) => setCurrentConfig(ele)}
              onEleMove={(_, ele) => {
                setCurrentConfig(ele);
                ele && devSettingRef.current?.update(ele);
              }}
            />
          </Background>
        </div>
        <DevSetting
          ref={devSettingRef}
          currentConfig={currentConfig}
          draggableRef={siteRef}
          hasElement={hasElement}
          getConfig={getConfig}
          onChange={values => viewRef.current?.updataElement({ ...values })}
          deleteElement={config => {
            const ok = viewRef.current?.deleteElement?.(config) ?? false;
            if (ok) refreshDeviceList();
            return ok;
          }}
        />
      </div>
    </div>
  );
}

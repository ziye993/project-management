import styles from '../index.module.less';
import { useEffect, useImperativeHandle, forwardRef, useRef, useState, useCallback } from 'react';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import Button from '@/components/ui/Button';
import type { TConfigRef } from '../themes/types';
import { EViewDatatype } from '../themes/types';
import { getMockStationsForDevice } from '../mock';
import type { MockStation } from '../mock';

export interface ElementConfigExtra {
  title?: string;
  key?: string;
}

export type ElementConfig = TConfigRef<ElementConfigExtra>;

interface DevSettingProps {
  currentConfig?: ElementConfig | null;
  draggableRef?: React.RefObject<HTMLDivElement | null>;
  onChange?: (values: ElementConfig) => void;
  deleteElement?: (config: ElementConfig) => boolean;
  hasElement: (ele: TConfigRef | number | string) => boolean;
  getConfig: (type: EViewDatatype) => TConfigRef[];
}

interface FormState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: string;
  background?: string;
  backgroundHex?: string;
  parentId?: string | number;
  textsContent?: string;
  textX?: number;
  textY?: number;
}

function rgbToHex(rgb?: string) {
  if (!rgb) return '#354866';
  if (rgb.startsWith('#')) return rgb;
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#354866';
  return `#${m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

function DevSetting(props: DevSettingProps, ref: React.Ref<{ update: (ele: ElementConfig) => void }>) {
  const { currentConfig, deleteElement } = props;
  const [form, setForm] = useState<FormState>({});
  const [stations, setStations] = useState<MockStation[]>([]);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const emitChange = useCallback((values: FormState, base: ElementConfig) => {
    const { textX, textY, width, height, x, y, textsContent, content, backgroundHex, parentId } = values;
    props.onChange?.({
      ...base,
      content,
      width,
      height,
      parentId,
      position: { ...base.position, x, y },
      background: backgroundHex ? hexToRgb(backgroundHex) : values.background,
      texts: [
        {
          parentId: base.id,
          index: 0,
          id: `${base.id}-t0`,
          type: 'text',
          size: 14,
          position: { x: textX, y: textY },
          content: textsContent,
        },
      ],
    } as ElementConfig);
  }, [props.onChange]);

  const updateField = (patch: Partial<FormState>) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      if (currentConfig) emitChange(next, currentConfig);
      return next;
    });
  };

  const fillForm = (config?: ElementConfig | null) => {
    const cfg = config ?? currentConfig;
    const {
      texts = [],
      position = {},
      width,
      height,
      content,
      background,
      parentId,
    } = cfg || {};

    setForm({
      x: position?.x,
      y: position?.y,
      width,
      height,
      content,
      background,
      backgroundHex: rgbToHex(background),
      parentId,
      textsContent: texts?.[0]?.content,
      textX: texts?.[0]?.position?.x,
      textY: texts?.[0]?.position?.y,
    });

    if (!cfg?.key) {
      setStations([]);
      return;
    }
    const list = getMockStationsForDevice(cfg.key);
    setStations(list.filter(s => !props.hasElement(s.siteName)));
  };

  useEffect(() => {
    fillForm(currentConfig);
  }, [currentConfig]);

  useImperativeHandle(ref, () => ({
    update: (ele: ElementConfig) => {
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => fillForm(ele), 300);
    },
  }));

  const parentOptions = props
    .getConfig(EViewDatatype.INS)
    .filter(c => c.id !== currentConfig?.id);

  return (
    <div
      className={`${styles.devSettingBox} ${collapsed ? styles.devSettingClose : ''}`}
      style={{ right: currentConfig ? '20px' : '-500px' }}
    >
      <div className={styles.openIcon} onClick={() => setCollapsed(v => !v)}>
        {collapsed ? <SettingOutlined /> : <CloseOutlined />}
      </div>
      <form className={styles.nativeForm} onSubmit={e => e.preventDefault()}>
        <h3 className={styles.title}>基础配置</h3>
        <label className={styles.formField}>
          <span>标识</span>
          <input readOnly disabled value={currentConfig?.key || ''} />
        </label>
        <label className={styles.formField}>
          <span>标题</span>
          <input
            value={form.content ?? ''}
            onChange={e => updateField({ content: e.target.value })}
          />
        </label>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span>长</span>
            <input
              type="number"
              value={form.width ?? ''}
              onChange={e => updateField({ width: Number(e.target.value) })}
            />
          </label>
          <label className={styles.formField}>
            <span>宽</span>
            <input
              type="number"
              value={form.height ?? ''}
              onChange={e => updateField({ height: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span>坐标X</span>
            <input
              type="number"
              value={form.x ?? ''}
              onChange={e => updateField({ x: Number(e.target.value) })}
            />
          </label>
          <label className={styles.formField}>
            <span>坐标Y</span>
            <input
              type="number"
              value={form.y ?? ''}
              onChange={e => updateField({ y: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className={styles.formField}>
          <span>背景色</span>
          <input
            type="color"
            value={form.backgroundHex ?? '#354866'}
            onChange={e => updateField({ backgroundHex: e.target.value })}
          />
        </label>
        <label className={styles.formField}>
          <span>父级</span>
          <select
            value={form.parentId ?? ''}
            onChange={e => updateField({ parentId: e.target.value || undefined })}
          >
            <option value="">无</option>
            {parentOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.content} (代码:{c.key})
              </option>
            ))}
          </select>
        </label>

        {currentConfig?.type === 'box' && (
          <div className={styles.textsBox}>
            <h3 className={styles.title}>文本配置</h3>
            <label className={styles.formField}>
              <span>内容</span>
              <input
                value={form.textsContent ?? ''}
                onChange={e => updateField({ textsContent: e.target.value })}
              />
            </label>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>坐标X</span>
                <input
                  type="number"
                  value={form.textX ?? ''}
                  onChange={e => updateField({ textX: Number(e.target.value) })}
                />
              </label>
              <label className={styles.formField}>
                <span>坐标Y</span>
                <input
                  type="number"
                  value={form.textY ?? ''}
                  onChange={e => updateField({ textY: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        )}

        <div className={styles.siteBox}>
          <h3 className={styles.title}>站台配置</h3>
          <div ref={props.draggableRef} className={styles.sitedraggableBox}>
            {stations.map((station, index) => (
              <div
                key={station.siteName}
                draggable
                className={styles.siteItem}
                data-json={JSON.stringify({
                  index,
                  label: station.siteName,
                  value: station.siteName,
                  type: 'box',
                  parentid: currentConfig?.id,
                  parentindex: currentConfig?.index,
                  width: 70,
                  height: 50,
                  eletype: 'site',
                })}
              >
                {station.siteName}
              </div>
            ))}
          </div>
        </div>
      </form>
      <div className={styles.bottomBox}>
        <Button
          className={styles.deleteBut}
          onClick={() => {
            if (currentConfig && deleteElement?.(currentConfig)) {
              setForm({});
            }
          }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

export default forwardRef(DevSetting);

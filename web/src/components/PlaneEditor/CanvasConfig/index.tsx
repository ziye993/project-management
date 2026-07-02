import styles from '../index.module.less';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { themeOptions, getThemePageDefaults } from '../themes';
import { EViewDatatype } from '../themes/types';
import type { PlanePageConfig, TConfigRef } from '../themes/types';

interface CanvasConfigProps {
  pageConfig: PlanePageConfig;
  onChange: (value: Partial<PlanePageConfig>) => void | Promise<void>;
  getConfig: (type: EViewDatatype) => TConfigRef[];
  saveData: () => void | Promise<void>;
}

export default function CanvasConfig(props: CanvasConfigProps) {
  const [open, setOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'ins' | 'nes'>('ins');
  const [configPreview, setConfigPreview] = useState<TConfigRef[]>([]);
  const [loading, setLoading] = useState(false);
  const { pageConfig } = props;

  const patchConfig = async (patch: Partial<PlanePageConfig>) => {
    setLoading(true);
    const themeDefaults = patch.theme != null ? getThemePageDefaults(patch.theme) : {};
    await props.onChange({ ...pageConfig, ...patch, ...themeDefaults });
    setLoading(false);
  };

  return (
    <div className={styles.configBox}>
      <div className={styles.inlineForm}>
        <label className={styles.fieldInline}>
          <span>画布长</span>
          <input
            type="number"
            disabled={loading}
            value={pageConfig.width}
            onChange={e => patchConfig({ width: Number(e.target.value) || 0 })}
          />
        </label>
        <label className={styles.fieldInline}>
          <span>画布宽</span>
          <input
            type="number"
            disabled={loading}
            value={pageConfig.height}
            onChange={e => patchConfig({ height: Number(e.target.value) || 0 })}
          />
        </label>
        <label className={styles.fieldInline}>
          <span>主题</span>
          <select
            disabled={loading}
            value={pageConfig.theme}
            onChange={e => patchConfig({ theme: e.target.value })}
          >
            {themeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>
      <Button
        onClick={() => {
          setConfigPreview(props.getConfig(EViewDatatype.INS));
          setOpen(true);
        }}
      >
        查看配置
      </Button>
      <Button color="primary" style={{ marginLeft: 16 }} onClick={() => props.saveData()}>
        保存
      </Button>
      <Modal
        open={open}
        title="配置预览"
        onClose={() => setOpen(false)}
        onOK={() => {
          props.saveData();
          setOpen(false);
        }}
        width={720}
      >
        <label className={styles.previewType}>
          数据类型：
          <select
            value={previewType}
            onChange={e => {
              const v = e.target.value as 'ins' | 'nes';
              setPreviewType(v);
              setConfigPreview(
                props.getConfig(v === 'ins' ? EViewDatatype.INS : EViewDatatype.NES),
              );
            }}
          >
            <option value="ins">平面数据</option>
            <option value="nes">嵌套数据</option>
          </select>
        </label>
        <pre className={styles.jsonView}>
          {JSON.stringify({ ...pageConfig, data: configPreview }, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

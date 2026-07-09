import { useState } from 'react';
import message from '@/components/ui/Modal/message';
import { setImageCryptoSettings } from '@/api/setConfig';
import {
  DEFAULT_IMAGE_CRYPTO_SETTINGS,
  mergeImageCryptoSettings,
  type ImageCryptoSettings,
} from '@/type/imageCryptoSettings';
import { invalidateImageCryptoSettingsCache } from '@/page/ImageCrypto/hooks/useImageCryptoSettings';
import styles from './index.module.less';

interface Props {
  initial?: Partial<ImageCryptoSettings> | null;
  onSaved?: () => void;
}

export default function ImageCryptoSettingsSection(props: Props) {
  const [form, setForm] = useState<ImageCryptoSettings>(() =>
    mergeImageCryptoSettings(props.initial),
  );

  const patch = (partial: Partial<ImageCryptoSettings>) => {
    setForm(prev => mergeImageCryptoSettings({ ...prev, ...partial }));
  };

  const save = async () => {
    await setImageCryptoSettings({ imageCryptoSettings: form });
    invalidateImageCryptoSettingsCache();
    message.success('图片加解密配置已保存');
    props.onSaved?.();
  };

  const reset = () => {
    setForm({ ...DEFAULT_IMAGE_CRYPTO_SETTINGS });
  };

  return (
    <div className={styles.mockDefaultsForm}>
      <label className={styles.mockFieldRow}>
        <span>免责声明</span>
        <input
          className={styles.input}
          value={form.disclaimerText}
          onChange={(e) => patch({ disclaimerText: e.target.value })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>JPEG 质量</span>
        <input
          className={styles.input}
          type="number"
          min={0.1}
          max={1}
          step={0.01}
          value={form.exportJpegQuality}
          onChange={(e) => patch({ exportJpegQuality: Number(e.target.value) })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>最大边长 px</span>
        <input
          className={styles.input}
          type="number"
          value={form.maxImageEdgePx}
          onChange={(e) => patch({ maxImageEdgePx: Number(e.target.value) })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>默认算法</span>
        <select
          className={styles.input}
          value={form.defaultAlgorithmId}
          onChange={(e) => patch({ defaultAlgorithmId: e.target.value })}
        >
          <option value="xiaofanqie">小番茄混淆</option>
          <option value="block">块混淆</option>
          <option value="row">行像素混淆</option>
          <option value="pixel">逐像素混淆</option>
          <option value="picEncryptRow">PicEncrypt 行模式</option>
          <option value="picEncryptRowCol">PicEncrypt 行+列模式</option>
        </select>
      </label>
      <label className={styles.mockFieldRow}>
        <span>密钥占位提示</span>
        <input
          className={styles.input}
          value={form.defaultKeyHint}
          onChange={(e) => patch({ defaultKeyHint: e.target.value })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>块混淆边长</span>
        <input
          className={styles.input}
          type="number"
          value={form.blockSize}
          onChange={(e) => patch({ blockSize: Number(e.target.value) })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>幻影坦克水印</span>
        <select
          className={styles.input}
          value={String(form.mirageWatermarkEnabled)}
          onChange={(e) => patch({ mirageWatermarkEnabled: e.target.value === 'true' })}
        >
          <option value="true">启用</option>
          <option value="false">禁用</option>
        </select>
      </label>
      <label className={styles.mockFieldRow}>
        <span>水印文案（竖排）</span>
        <input
          className={styles.input}
          value={form.mirageWatermarkText}
          onChange={(e) => patch({ mirageWatermarkText: e.target.value })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>智能显形组数/轮</span>
        <input
          className={styles.input}
          type="number"
          value={form.presetGroupCount}
          onChange={(e) => patch({ presetGroupCount: Number(e.target.value) })}
        />
      </label>
      <label className={styles.mockFieldRow}>
        <span>最少收窄轮数</span>
        <input
          className={styles.input}
          type="number"
          value={form.minRefineRounds}
          onChange={(e) => patch({ minRefineRounds: Number(e.target.value) })}
        />
      </label>
      <div className={styles.mockFieldGroup}>
        <span className={styles.mockFieldGroupTitle}>双图合并参数代号</span>
        {(['exposure', 'contrast', 'saturation', 'opacity', 'blendMode'] as const).map(key => (
          <label key={key} className={styles.mockFieldRow}>
            <span>{key}</span>
            <input
              className={styles.input}
              value={form.blendParamCodes[key]}
              onChange={(e) =>
                patch({
                  blendParamCodes: { ...form.blendParamCodes, [key]: e.target.value },
                })
              }
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className={styles.saveBtn} onClick={save}>保存</button>
        <button type="button" className={styles.saveBtn} onClick={reset}>恢复默认</button>
      </div>
    </div>
  );
}

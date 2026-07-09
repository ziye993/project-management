import { useState } from 'react';
import type { PresetGroup } from '../utils/smartReveal/sessionState';
import PreviewLightbox from './PreviewLightbox';
import styles from './PresetGrid.module.less';

interface PresetGridProps {
  presets: PresetGroup[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  onSave?: (index: number, variant: 'light' | 'dark') => void;
}

function formatMeta(group: PresetGroup) {
  return `黑场 ${group.params.levelMin} · 白场 ${group.params.levelMax} · 对比 ${group.params.contrast} · γ ${group.params.gamma}`;
}

export default function PresetGrid(props: PresetGridProps) {
  const [lightbox, setLightbox] = useState<PresetGroup | null>(null);

  return (
    <>
      <div className={styles.grid}>
        {props.presets.map(group => (
          <div
            key={group.index}
            className={`${styles.card} ${props.selectedIndex === group.index ? styles.selected : ''}`}
          >
            <div className={styles.cardHeader}>
              <span className={styles.groupLabel}>预设 #{group.index + 1}</span>
              <span className={styles.meta}>{formatMeta(group)}</span>
            </div>
            <div className={styles.previews}>
              <figure
                className={styles.previewFigure}
                onClick={() => setLightbox(group)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setLightbox(group)}
              >
                <div className={styles.previewFrame} data-bg="light">
                  <img src={group.lightPreviewUrl} alt="浅底显形" />
                </div>
                <figcaption>浅底显形 · 点击放大</figcaption>
              </figure>
              <figure
                className={styles.previewFigure}
                onClick={() => setLightbox(group)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setLightbox(group)}
              >
                <div className={styles.previewFrame} data-bg="dark">
                  <img src={group.darkPreviewUrl} alt="深底显形" />
                </div>
                <figcaption>深底显形 · 点击放大</figcaption>
              </figure>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={() => props.onSelect(group.index)}>
                选择此组
              </button>
              <button type="button" className={styles.zoomBtn} onClick={() => setLightbox(group)}>
                放大对比
              </button>
              {props.onSave && (
                <>
                  <button type="button" onClick={() => props.onSave!(group.index, 'light')}>保存浅底</button>
                  <button type="button" onClick={() => props.onSave!(group.index, 'dark')}>保存深底</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <PreviewLightbox
        open={!!lightbox}
        title={lightbox ? `预设 #${lightbox.index + 1}` : ''}
        lightUrl={lightbox?.lightPreviewUrl ?? ''}
        darkUrl={lightbox?.darkPreviewUrl ?? ''}
        meta={lightbox ? formatMeta(lightbox) : undefined}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}

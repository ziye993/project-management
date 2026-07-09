import type { BlendMode, BlendParams } from '../utils/algorithms/blend';
import type { BlendParamCodes } from '@/type/imageCryptoSettings';
import styles from './BlendSliders.module.less';

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'multiply', label: '正片叠底' },
  { value: 'screen', label: '滤色' },
  { value: 'overlay', label: '叠加' },
  { value: 'darken', label: '变暗' },
  { value: 'lighten', label: '变亮' },
];

interface BlendSlidersProps {
  params: BlendParams;
  codes: BlendParamCodes;
  onChange: (next: BlendParams) => void;
}

function SliderRow(props: {
  label: string;
  code: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.row}>
      <span>{props.label} ({props.code})</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className={styles.val}>{props.value}</span>
    </label>
  );
}

export default function BlendSliders(props: BlendSlidersProps) {
  const { params, codes, onChange } = props;
  const patch = (partial: Partial<BlendParams>) => onChange({ ...params, ...partial });

  return (
    <div className={styles.box}>
      <SliderRow label="曝光" code={codes.exposure} min={-100} max={100} value={params.exposure} onChange={(v) => patch({ exposure: v })} />
      <SliderRow label="对比度" code={codes.contrast} min={-100} max={100} value={params.contrast} onChange={(v) => patch({ contrast: v })} />
      <SliderRow label="饱和度" code={codes.saturation} min={-100} max={100} value={params.saturation} onChange={(v) => patch({ saturation: v })} />
      <SliderRow label="不透明度" code={codes.opacity} min={0} max={100} value={params.opacity} onChange={(v) => patch({ opacity: v })} />
      <label className={styles.row}>
        <span>混合模式 ({codes.blendMode})</span>
        <select value={params.blendMode} onChange={(e) => patch({ blendMode: e.target.value as BlendMode })}>
          {BLEND_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

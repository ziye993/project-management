import { getAlgorithm } from '../utils/algorithms/registry';
import styles from './KeyInput.module.less';

interface KeyInputProps {
  algorithmId: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
}

export default function KeyInput(props: KeyInputProps) {
  const algo = getAlgorithm(props.algorithmId);
  if (!algo?.needsKey) return null;

  const valid = props.value ? algo.validateKey(props.value) : false;
  const rangeHint = algo.keyType === 'number' && algo.keyRange
    ? `(${algo.keyRange.open ? '开区间' : '闭区间'} ${algo.keyRange.min} ~ ${algo.keyRange.max})`
    : '任意字符串';

  return (
    <label className={styles.row}>
      <span>密钥</span>
      <input
        className={`${styles.input} ${props.value && !valid ? styles.invalid : ''}`}
        type={algo.keyType === 'number' ? 'text' : 'text'}
        value={props.value}
        placeholder={props.hint ?? rangeHint}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.value && !valid && (
        <span className={styles.err}>密钥无效，范围 {rangeHint}</span>
      )}
    </label>
  );
}

export function isKeyValid(algorithmId: string, key: string): boolean {
  const algo = getAlgorithm(algorithmId);
  if (!algo) return false;
  if (!algo.needsKey) return true;
  return algo.validateKey(key);
}

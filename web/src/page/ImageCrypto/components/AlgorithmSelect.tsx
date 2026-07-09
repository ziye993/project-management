import { SCRAMBLE_ALGORITHMS } from '../utils/algorithms/registry';
import styles from './AlgorithmSelect.module.less';

interface AlgorithmSelectProps {
  value: string;
  onChange: (id: string) => void;
}

export default function AlgorithmSelect(props: AlgorithmSelectProps) {
  return (
    <label className={styles.row}>
      <span>算法</span>
      <select
        className={styles.select}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {SCRAMBLE_ALGORITHMS.map(a => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
    </label>
  );
}

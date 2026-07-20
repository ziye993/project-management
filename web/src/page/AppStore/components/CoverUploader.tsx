import styles from './components.module.less';

interface CoverUploaderProps {
  value: string;
  onChange: (coverPath: string) => void;
}

/** Optional cover: simple path/URL text input (upload can be added later). */
export default function CoverUploader(props: CoverUploaderProps) {
  return (
    <div className={styles.coverUploader}>
      <input
        type="text"
        value={props.value}
        placeholder="封面路径或 URL（可选）"
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

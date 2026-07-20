import styles from './components.module.less';

interface ChangelogEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChangelogEditor(props: ChangelogEditorProps) {
  return (
    <textarea
      className={styles.changelog}
      value={props.value}
      placeholder={props.placeholder || '本版本更新说明'}
      rows={6}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

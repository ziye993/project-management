import styles from './index.module.less';

interface ChatFilesFilterProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ChatFilesFilter(props: ChatFilesFilterProps) {
  return (
    <label className={styles.filterToggle}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={e => props.onChange(e.target.checked)}
      />
      聊天文件
    </label>
  );
}

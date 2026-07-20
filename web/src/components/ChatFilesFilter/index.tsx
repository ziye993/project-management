import styles from './index.module.less';
import ListFilterBar from '@/components/ListFilterBar';

interface ChatFilesFilterProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Thin wrapper around ListFilterBar for backward compatibility. */
export default function ChatFilesFilter(props: ChatFilesFilterProps) {
  return (
    <ListFilterBar
      fields={[{ type: 'toggle', key: 'chatOnly', label: '聊天文件' }]}
      value={{ chatOnly: props.checked }}
      onChange={(next) => props.onChange(Boolean(next.chatOnly))}
      className={styles.filterToggle}
    />
  );
}

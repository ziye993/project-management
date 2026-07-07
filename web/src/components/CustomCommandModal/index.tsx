import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import styles from './index.module.less';

interface CustomCommandModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { title: string; command: string }) => void;
}

export default function CustomCommandModal(props: CustomCommandModalProps) {
  const [title, setTitle] = useState('');
  const [command, setCommand] = useState('');

  useEffect(() => {
    if (props.open) {
      setTitle('');
      setCommand('');
    }
  }, [props.open]);

  const handleOk = () => {
    const trimmedTitle = title.trim();
    const trimmedCommand = command.trim();
    if (!trimmedTitle) {
      message.info('请输入展示标题');
      return;
    }
    if (!trimmedCommand) {
      message.info('请输入执行命令');
      return;
    }
    props.onConfirm({ title: trimmedTitle, command: trimmedCommand });
    props.onClose();
  };

  return (
    <Modal
      open={props.open}
      title="新增自定义项目指令"
      onClose={props.onClose}
      onOK={handleOk}
      width="520px"
    >
      <div className={styles.form}>
        <label className={styles.field}>
          <span>title</span>
          <input
            className={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例如 zip"
          />
        </label>
        <label className={styles.field}>
          <span>command</span>
          <textarea
            className={styles.textarea}
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="例如 zip -r dist.zip dist"
            rows={4}
          />
        </label>
      </div>
    </Modal>
  );
}

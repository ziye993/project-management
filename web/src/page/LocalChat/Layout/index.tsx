import { HomeOutlined, MessageOutlined } from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import { loadChatIdentity } from '../../../utils/chatIdentity';
import styles from './index.module.less';

export default function ChatLayout(props: { children?: React.ReactNode }) {
  const { push } = useNavigate();
  const identity = loadChatIdentity();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={() => push('/')}>
          <HomeOutlined /> 返回首页
        </button>
        <div className={styles.title}>
          <MessageOutlined /> 对话
        </div>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => push('/localChat/profile')}
          title="个人信息"
        >
          <span className={styles.avatar}>{identity.avatar}</span>
        </button>
      </header>
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}

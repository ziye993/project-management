import { useNavigate } from '../../../Router';
import ToolPageLayout, { layoutStyles } from '../../../compomeents/ToolPageLayout';
import { loadChatIdentity } from '../../../utils/chatIdentity';
import styles from './index.module.less';

export default function ChatLayout(props: { children?: React.ReactNode }) {
  const { push } = useNavigate();
  const identity = loadChatIdentity();

  return (
    <ToolPageLayout
      mainClassName={layoutStyles.mainFill}
      actions={
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => push('/localChat/profile')}
          title="个人信息"
        >
          <span className={styles.avatar}>{identity.avatar}</span>
        </button>
      }
    >
      {props.children}
    </ToolPageLayout>
  );
}

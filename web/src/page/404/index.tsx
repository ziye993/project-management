import { useNavigate } from '@/Router';
import PageShell, { shellStyles } from '@/components/PageShell';
import Button from '@/components/ui/Button';
import styles from './index.module.less';

export default function NotFound() {
  const { push } = useNavigate();

  return (
    <PageShell className={styles.shell}>
      <div className={`${shellStyles.contentPanel} ${styles.content}`}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.desc}>页面不存在或已被移除</p>
        <Button onClick={() => push('/')}>返回首页</Button>
      </div>
    </PageShell>
  );
}

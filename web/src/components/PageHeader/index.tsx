import { HomeOutlined } from '@ant-design/icons';
import Button from '@/components/ui/Button';
import styles from './index.module.less';
import { useNavigate } from '../../Router';

interface PageHeaderProps {
  children?: React.ReactNode;
  homePath?: string;
}

export default function PageHeader(props: PageHeaderProps) {
  const { push } = useNavigate();
  return (
    <div className={styles.box}>
      <Button
        className={styles.homeBtn}
        aria-label="返回主页"
        onClick={() => push(props.homePath ?? '/')}
      >
        <HomeOutlined className={styles.homeIcon} />
      </Button>
      <div className={styles.actions}>{props.children}</div>
    </div>
  );
}

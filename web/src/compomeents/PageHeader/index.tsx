import { HomeOutlined } from '@ant-design/icons';
import Button from '../../UiComponents/Button';
import styles from './index.module.less';
import { useNavigate } from '../../Router';

interface PageHeaderProps {
  children?: React.ReactNode;
}

export default function PageHeader(props: PageHeaderProps) {
  const { push } = useNavigate();
  return (
    <div className={styles.box}>
      <Button onClick={() => push('/')}>
        <HomeOutlined />
      </Button>
      <div className={styles.actions}>{props.children}</div>
    </div>
  );
}

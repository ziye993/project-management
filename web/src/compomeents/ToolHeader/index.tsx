
import { SyncOutlined, HomeOutlined } from '@ant-design/icons'
import styles from './index.module.less';
import { useNavigate } from '../../Router';
import Button from '../../UiComponents/Button';

export default function ToolHead(props: { forceRefreshList?: () => void }) {
  const { push } = useNavigate();

  return <div className={styles.box}>
    <Button className={styles.item} onClick={() => { push('/') }}>
      <HomeOutlined />
    </Button>
    <Button className={styles.item} onClick={() => props?.forceRefreshList?.()}>
      <SyncOutlined /> 同步配置
    </Button>
  </div>
}

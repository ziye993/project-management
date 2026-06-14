import { HomeOutlined, UploadOutlined } from '@ant-design/icons';
import Button from '../../../UiComponents/Button';
import styles from './index.module.less';
import { useNavigate } from '../../../Router';

export default function Header(props: any) {

    const { push } = useNavigate();

    return <div className={styles.headerBox}>
        <Button onClick={() => { push('/') }}>
            <HomeOutlined />
        </Button>
        <Button onClick={() => { props?.setUploadOpen(true); }}>
            <UploadOutlined /> 上传
        </Button>
    </div>
}
import {HomeOutlined} from '@ant-design/icons';
import Button from '../../../UiComponents/Button';
import styles from './index.module.less';
import {useNavigate} from '../../../Router';

export default function Header( ) {

    const {push} = useNavigate();

    return <div className={styles.headerBox}>
        <Button onClick={() => {
            push('/')
        }}>
            <HomeOutlined/>
        </Button>

    </div>
}

import styles from './index.module.less'

interface IProps {
    className?: string;
    children?: React.ReactNode;
}

export default function UserHeader(props: IProps) {
    return <div className={`${styles.box} ${props.className || ''}`}>
        <div className={styles.otherChildren}>
            {props.children}
        </div>
        <div className={styles.brand}>项目管理</div>
    </div>
}

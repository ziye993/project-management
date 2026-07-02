
import styles from './index.module.less'

interface IProps {
    className?: string;
    children?: React.ReactNode;
    actions?: React.ReactNode;
}

export default function UserHeader(props: IProps) {
    return <div className={`${styles.box} ${props.className || ''}`}>
        <div className={styles.otherChildren}>
            {props.children}
        </div>
        {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
    </div>
}

import styles from './index.module.less';

export default function ImgItemBox(props: any) {
    return <div className={styles.imgItemBox}>
        <img src={props.src} alt="" className={styles.tmpimg} />
        <p>{props.name}</p>
        <div className={styles.imgInfo}>

            <p></p>
            <p></p>
        </div>
    </div>
}
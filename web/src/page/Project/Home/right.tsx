import { ApiOutlined, CloseCircleOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { IProjectListItem } from '../../../type';
import styles from './index.module.less';


interface IProps {
    currentProject: IProjectListItem,
    setCommandChecked: Function;
    runCommand: Function;
    close: Function;
    stop: Function;
}
export default function Right(props: IProps) {
    const { currentProject, setCommandChecked, runCommand, close, stop } = props;
    return (<div className={styles.list}>
        <p>正在运行中的</p>
        {currentProject?.scripts?.filter?.(_ => _?.running !== undefined)?.map(_ => {
            return <div key={_.value} className={`${styles.itemBox} ${styles.runningItemBox} ${_?.checked ? styles.checkedItem : ''}`} onClick={() => { setCommandChecked(_) }}>
                <span>{_.label}</span>
                <div>
                    {_.running && !_.connect && <ApiOutlined onClick={() => runCommand(_)} />}
                    {_.running ? <PauseCircleOutlined onClick={(e) => { e.stopPropagation(); stop(_) }} /> : <PlayCircleOutlined onClick={(e) => { e.stopPropagation(); runCommand(_) }} />}
                    <CloseCircleOutlined onClick={(e) => { e.stopPropagation(); close(_) }} />

                </div>

            </div>
        })}
    </div>)
}
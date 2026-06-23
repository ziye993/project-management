import { ApiOutlined, CloseCircleOutlined, PauseCircleOutlined, PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { IProjectListItem } from '../../../type';
import styles from './index.module.less';


interface IProps {
    currentProject: IProjectListItem,
    setCommandChecked: Function;
    runCommand: Function;
    reconnectCommand: Function;
    close: Function;
    stop: Function;
}
export default function Right(props: IProps) {
    const { currentProject, setCommandChecked, runCommand, reconnectCommand, close, stop } = props;
    const runningScripts = currentProject?.scripts?.filter?.(_ => _?.running !== undefined) ?? [];

    return (<div className={`${styles.list} ${styles.runningPanel}`}>
        <p className={styles.panelTitle}><ThunderboltOutlined /> 运行记录</p>
        {runningScripts.length === 0 && (
            <p className={styles.emptyHint}>暂无运行记录</p>
        )}
        {runningScripts.map(_ => {
            const statusClass = _.running ? styles.runningActive : styles.runningPaused;
            return <div key={_.value} className={`${styles.itemBox} ${styles.runningItemBox} ${statusClass} ${_?.checked ? styles.checkedItem : ''}`} onClick={() => { setCommandChecked(_) }}>
                <span>{_.label}</span>
                <div>
                    {_.running && !_.connect && (
                        <ApiOutlined
                            title="断线重连"
                            onClick={(e) => { e.stopPropagation(); reconnectCommand(_); }}
                        />
                    )}
                    {_.running ? <PauseCircleOutlined onClick={(e) => { e.stopPropagation(); stop(_) }} /> : <PlayCircleOutlined onClick={(e) => { e.stopPropagation(); runCommand(_) }} />}
                    <CloseCircleOutlined onClick={(e) => { e.stopPropagation(); close(_) }} />

                </div>

            </div>
        })}
    </div>)
}

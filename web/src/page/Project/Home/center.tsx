import GlobalScripts from '../../../compomeents/GlobalScripts';
import type { IProjectListItem, IProjectScript } from '../../../type';
import styles from './index.module.less';


interface IProps {
    currentProject: IProjectListItem,
    currentCommand: IProjectScript;
    refCount: number;
    runCommand: Function;
    logs: any[];
    commandBoxRef: React.RefObject<HTMLDivElement | null>;
}
export default function Center(props: IProps) {
    const { currentProject, currentCommand, refCount, runCommand, logs, commandBoxRef } = props;

    return (<div className={styles.content} style={{ width: "0px" }}>
        <div className={styles.contentHeadButton}  >
            <GlobalScripts className={`${styles.comButton} ${styles.globalScripts}`} item={{ path: currentProject?.path, }} />

            {currentProject?.scripts?.filter?.(_ => _?.running === undefined)?.map((_: any) => {
                return <div key={_.value} style={{ order: _.sortIndex }} className={`${styles.comButton} ${_?.checked ? styles.comButtonChecked : ''}`} onClick={() => runCommand(_)}>{_?.label}</div>
            })}

        </div>
        <div className={styles.commandBottonLine}></div>
        <div className={styles.cmdContent}>
            {currentCommand?.label && <code className={styles.commandName} >{currentCommand?.label} {`：`} {currentCommand?.command}</code>}
            <div className={styles.commandLogBox} ref={commandBoxRef} >
                {refCount && logs.map((_, index) => {
                    return <code key={index} className={styles.codeline} style={{ color: _.type === 'error' ? 'red' : '#333', margin: '2px 0' }}>
                        {_.text}
                    </code>
                })}
            </div>
        </div>
    </div>)
}
import GlobalScripts from '@/components/GlobalScripts';
import LinkifiedText from '@/components/LinkifiedText';
import { customCommandValue, type CustomProjectCommand } from '@/constants/customCommands';
import type { IProjectListItem, IProjectScript } from '../../../type';
import { mixBorderColor, softenButtonColor } from '../../../utils/color';
import styles from './index.module.less';

interface CustomRunState {
  running?: boolean;
  connect?: boolean;
  checked?: boolean;
}

interface IProps {
    currentProject: IProjectListItem,
    currentCommand: IProjectScript | null;
    customCommands: CustomProjectCommand[];
    customRunState: Record<string, CustomRunState>;
    refCount: number;
    runCommand: Function;
    runCustomCommand: Function;
    logs: any[];
    commandBoxRef: React.RefObject<HTMLDivElement | null>;
}

function CommandButton({
    script,
    projectColor,
    pinned,
    onClick,
}: {
    script: IProjectScript;
    projectColor?: string;
    pinned?: boolean;
    onClick: () => void;
}) {
    const accentStyle = pinned && projectColor
        ? {
            '--btn-bg': softenButtonColor(projectColor),
            '--btn-border': mixBorderColor(projectColor),
            backgroundColor: 'var(--btn-bg)',
            borderColor: 'var(--btn-border)',
        } as React.CSSProperties
        : undefined;

    return (
        <div
            key={script.value}
            style={accentStyle}
            className={`${styles.comButton} ${pinned ? styles.pinnedButton : ''} ${script?.checked ? styles.comButtonChecked : ''}`}
            onClick={onClick}
        >
            {script?.label}
        </div>
    );
}

export default function Center(props: IProps) {
    const {
        currentProject,
        currentCommand,
        customCommands,
        customRunState,
        refCount,
        runCommand,
        runCustomCommand,
        logs,
        commandBoxRef,
    } = props;

    const idleScripts = currentProject?.scripts?.filter?.(_ => _?.running === undefined) ?? [];
    const pinnedScripts = idleScripts
        .filter(_ => _.isPinned)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
    const otherScripts = idleScripts
        .filter(_ => !_.isPinned)
        .sort((a, b) => a.label.localeCompare(b.label));
    const projectColor = currentProject?.color;

    return (<div className={styles.content} style={{ width: "0px" }}>
        <div className={styles.commandRows}>
            <div className={styles.commandRow}>
                <GlobalScripts className={`${styles.comButton} ${styles.globalScripts}`} item={{ path: currentProject?.path, }} />
                {customCommands.map((cmd) => {
                    const value = customCommandValue(cmd.id);
                    const state = customRunState[value];
                    return (
                        <div
                            key={cmd.id}
                            className={`${styles.comButton} ${state?.checked ? styles.comButtonChecked : ''}`}
                            onClick={() => runCustomCommand(cmd)}
                        >
                            {cmd.title}
                        </div>
                    );
                })}
            </div>
            <div className={styles.commandRow}>
                <div className={styles.pinnedSection}>
                    {pinnedScripts.map((script) => (
                        <CommandButton
                            key={script.value}
                            script={script}
                            projectColor={projectColor}
                            pinned
                            onClick={() => runCommand(script)}
                        />
                    ))}
                </div>
                {otherScripts.length > 0 && (
                    <div className={styles.scrollableSection}>
                        {otherScripts.map((script) => (
                            <CommandButton
                                key={script.value}
                                script={script}
                                onClick={() => runCommand(script)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
        <div className={styles.commandBottonLine}></div>
        <div className={styles.cmdContent}>
            {currentCommand?.label && <code className={styles.commandName} >{currentCommand?.label} {`：`} {currentCommand?.command}</code>}
            <div className={styles.commandLogBox} ref={commandBoxRef} >
                {refCount && logs.map((_, index) => {
                    return <code key={index} className={styles.codeline} style={{ color: _.type === 'error' ? '#dc2626' : '#334155', margin: '2px 0' }}>
                        <LinkifiedText text={_.text} />
                    </code>
                })}
            </div>
        </div>
    </div>)
}

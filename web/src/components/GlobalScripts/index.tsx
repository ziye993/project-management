import cursorLogo from '../../assets/cursorLogo.svg';
import vscodeLogo from '../../assets/vscodeLogo.svg';
import styles from './index.module.less';
import { openInCursor, openInVscode } from "@/api/project";

interface IProps {
  className?: string;
  item: { path?: string };
}

function EditorButton({
  className,
  logo,
  label,
  onClick,
}: {
  className?: string;
  logo?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className={`${styles.globalScriptBox} ${className ?? ''}`} onClick={onClick}>
      {logo ? <img src={logo} alt={label} /> : <span className={styles.textLabel}>{label}</span>}
    </div>
  );
}

export default function GlobalScripts(props: IProps) {
  const openEditor = async (editor: 'vscode' | 'cursor') => {
    if (!props.item?.path) {
      return;
    }
    const request = editor === 'vscode' ? openInVscode : openInCursor;
    const { success, msg } = await request({ path: props.item.path });
    if (!success) {
      console.log(msg);
    }
  };

  return (
    <>
      <EditorButton
        className={props.className}
        logo={vscodeLogo}
        label="vscode"
        onClick={() => openEditor('vscode')}
      />
      <EditorButton
        className={props.className}
        logo={cursorLogo}
        label="cursor"
        onClick={() => openEditor('cursor')}
      />
    </>
  );
}

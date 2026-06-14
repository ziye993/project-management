import { useState } from "react";

import vscodeLogo from '../../assets/vscodeLogo.svg';
import styles from './index.module.less';
import { openInVscode } from "../../server/project";
// import { useNavigate } from "../../Router";

interface IProps {
  className?: string;
  item: any;
}
export default function (props: IProps) {
  const [status, setStatus] = useState({ vscode: false });
  // const { push } = useNavigate();
  console.log(status)
  const vscodeClick = async () => {
    if (!props.item) {
      return
    }
    const { success, msg, error } = await openInVscode({ ...props.item });
    if (success) {
      setStatus(prev => ({ ...prev, vscode: true }));
    } else {
      console.log(msg, error);
    }
  }

  return <>
    <div className={`${styles.globalScriptBox} ${props.className}`} onClick={() => vscodeClick()}><img src={vscodeLogo} /></div>
  </>
}
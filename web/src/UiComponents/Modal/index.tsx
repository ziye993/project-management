import ReactDOM from 'react-dom';
import styles from './index.module.less'
import * as React from "react";
import { useEffect } from "react";
import Button from '../Button';
import { CloseOutlined } from '@ant-design/icons';


interface IProps {
  open?: boolean;
  title?: React.ReactNode;
  onClose?: () => void;
  onOK?: () => void;
  children?: React.ReactNode;
  width?: string | number;
  [key: string]: any;
}

const ANIMATION_DURATION = 500;

const DomModal = (props: IProps) => {
  const { open, onClose, onOK } = props;
  const [renderModal, setRenderModal] = React.useState(open);
  const [animatedOpen, setAnimatedOpen] = React.useState(false);

  useEffect(() => {
    if (open) {
      setRenderModal(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimatedOpen(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setAnimatedOpen(false);
    const timer = setTimeout(() => setRenderModal(false), ANIMATION_DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  return (renderModal && <div className={`${styles.box} ${animatedOpen ? styles.boxOpen : styles.boxClose}`} >
    <div className={`${styles.content} ${animatedOpen ? styles.contentOpen : styles.contentClose}`} style={{ width: props.width }}>
      <div className={styles.title}><div>{props.title || ""}</div> <span><CloseOutlined onClick={onClose} /></span></div>
      <div className={styles.userContent}>{props.children}</div>
      <div className={styles.footer}>
        <Button color='primary' onClick={onOK}>确定</Button>
        <Button onClick={onClose}>取消</Button>
      </div>
    </div>
  </div>)
}




export default function Modal(props: IProps) {
  if (document.getElementById("modalRoot")) {
    return ReactDOM.createPortal(<DomModal {...props} />, document.getElementById("modalRoot") as any)
  }
  return null
}
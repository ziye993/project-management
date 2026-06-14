import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, type ReactNode } from "react"
import ReactDOM from "react-dom";
import styles from './index.module.less'
import { createRoot } from "react-dom/client";

export enum MESSAGE_TYPE { 'success' = "success", 'error' = 'error', 'info' = 'info' }
const MESSAGE_ICON: Record<string, ReactNode> = {
    "success": <CheckCircleOutlined style={{ color: '#6bff57ff' }} />,
    "error": <CloseCircleOutlined style={{ color: '#ff5656ff' }} />,
    "info": <ExclamationCircleOutlined style={{ color: 'rgba(255, 244, 87, 1)' }} />
}

interface IProps {
    content?: ReactNode;
    type?: MESSAGE_TYPE | 'success' | 'error' | 'info';
}

const MessageModal = (props: IProps) => {
    const [open, setOpen] = useState(true);
    const type = props?.type || 'success';
    const content = props.content;
    const id = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        id.current = setTimeout(() => {
            setOpen(false)
        }, 2000)
        return () => {
            if (id.current) clearTimeout(id.current);
        }
    }, [])

    return <div className={styles.messageBox} style={{ opacity: open ? 1 : 0, zIndex: open ? 1000 : -1 }}>{MESSAGE_ICON[type]}{content}</div>
}

function Modal(props?: IProps) {
    return ReactDOM.createPortal(<MessageModal {...(props || {})} />, document.getElementById("messageRoot") as HTMLElement)
}

const message = {
    show: (props: IProps) => {
        createRoot(document.getElementById("messageRoot") as HTMLElement).render(<Modal {...props} />);
    },
    success: (props: IProps | string) => {
        if (typeof props === 'string') {
            message.show({ content: props, type: 'success' });
            return
        }
        message.show({ ...props, type: 'success' });
    },
    info: (props: IProps | string) => {
        if (typeof props === 'string') {
            message.show({ content: props, type: 'info' });
            return
        }
        message.show({ ...props, type: 'info' });
    },
    error: (props: IProps | string) => {
        if (typeof props === 'string') {
            message.show({ content: props, type: 'error' });
            return
        }
        message.show({ ...props, type: 'error' });
    },
}

export default message;

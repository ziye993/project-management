import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import { useRef, useState, type ChangeEvent } from 'react'

export default function (props: any) {
    const [fileList, setFileList] = useState<any[]>([]);
    const fileListRef = useRef<any[]>([]);

    const fileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const newFiles: any[] = [];
        const newFileRef: any[] = [];
        const files = e?.target?.files;
        if (!files || !files.length) {
            return
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file instanceof File) {
                newFiles.push({
                    name: file.name,
                    size: file.size
                });
                newFileRef.push(file);
            }
        }
        setFileList(prev => [...prev, ...newFiles])
        fileListRef.current = [...fileListRef.current, ...newFileRef];
        try {
            await props.onChange(fileListRef.current)
        } catch (error) {

        }

    }
    const deleteListItem = async (index: number) => {
        setFileList(prev => {
            const nprev = [...prev];
            nprev.splice(index, 1);
            return nprev
        });
        fileListRef.current.splice(index, 1);
        try {
            await props.onChange(fileListRef.current)
        } catch (error) {

        }
    }

    const formatSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
    };

    return <>
        <div className={styles.uploadBox} >
            <PlusOutlined /> <span>选择照片或视频</span>
            <input type='file' {...props} onChange={(e) => fileChange(e)} />
        </div>
        <div className={styles.fileList}>
            {fileList.length ? <div className={styles.fileListHeader}>
                <span style={{ flex: 1 }}>名称</span> <span>大小</span>
            </div> : null}
            {fileList.map((_, index) => {
                return <div key={index} className={styles.fileListItem}>
                    <DeleteOutlined onClick={() => { deleteListItem(index) }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{_.name}</span>
                    <span>{formatSize(_.size)}</span>
                </div>
            })}
        </div>
    </>
}

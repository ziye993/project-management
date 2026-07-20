import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'

export default function (props: any) {
    const [fileList, setFileList] = useState<any[]>([]);
    const fileListRef = useRef<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const applyFiles = async (files: FileList | File[] | null) => {
        if (!files || !files.length) return;
        const newFiles: any[] = [];
        const newFileRef: any[] = [];
        const list = Array.from(files as FileList | File[]);
        for (const file of list) {
            if (file instanceof File) {
                newFiles.push({
                    name: file.name,
                    size: file.size
                });
                newFileRef.push(file);
            }
        }
        if (!newFileRef.length) return;
        setFileList(prev => [...prev, ...newFiles])
        fileListRef.current = [...fileListRef.current, ...newFileRef];
        try {
            await props.onChange(fileListRef.current)
        } catch (error) {

        }
    }

    const fileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        await applyFiles(e?.target?.files);
        e.target.value = '';
    }

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        void applyFiles(e.dataTransfer.files);
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

    const { onChange: _onChange, ...inputProps } = props;

    return <>
        <div
            className={`${styles.uploadBox} ${dragOver ? styles.dragOver : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
            }}
            onDrop={onDrop}
        >
            <PlusOutlined /> <span>{dragOver ? '松开以上传' : '点击或拖拽文件到此处'}</span>
            <input
                ref={inputRef}
                type='file'
                {...inputProps}
                className={styles.hiddenInput}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => fileChange(e)}
            />
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

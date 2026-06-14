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
            // 检查 item 是否是 File 对象
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
        fileListRef.current = fileListRef.current?.splice(index, 1);
        try {
            await props.onChange(fileListRef.current)
        } catch (error) {

        }
    }

    return <>
        <div className={styles.uploadBox} >
            <PlusOutlined /> <span>选择照片或视频</span>
            <input type='file' {...props} onChange={(e) => fileChange(e)} />
        </div>
        <div className={styles.fileList}>
            {fileList.length ? <div className={styles.fleListItem} style={{ fontSize: '14px', lineHeight: '16px', marginTop: "10px", color: '#919191ff', marginBottom: '8px' }}>
                <span style={{ color: '#595959ff', padding: '0 30px 0 0' }} ></span><span style={{ flex: 1 }}>{'名称'}</span> <span>{'大小'}</span>
            </div> : null}
            {fileList.map((_, index) => {
                return <div className={styles.fleListItem}>
                    <DeleteOutlined onClick={() => { deleteListItem(index) }} /> <span style={{ flex: 1 }}>{_.name}</span> <span>{_.size}</span>
                </div>
            })}
        </div>
    </>
}
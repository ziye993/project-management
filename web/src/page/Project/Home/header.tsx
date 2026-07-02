
import { FolderAddOutlined, FolderOpenOutlined, SyncOutlined, BgColorsOutlined } from '@ant-design/icons'
import styles from './index.module.less';
import { importWorkspace, importProject, refreshColorCache } from '@/api/project';
import Button from '@/components/ui/Button';
import message from '@/components/ui/Modal/message';
import FileSelect, { type FileSelectResult } from '@/components/FileSelect';
import { useRef, useState } from 'react';

interface IProps {
  forceRefreshList: () => void;
  onColorRefresh: () => void;
}

type ImportMode = 'workspace' | 'project' | null;

export default function Header(props: IProps) {
  const [selectOpen, setSelectOpen] = useState(false);
  const importMode = useRef<ImportMode>(null);

  const openImport = (mode: ImportMode) => {
    importMode.current = mode;
    setSelectOpen(true);
  };

  const handleSelectOK = async (info: FileSelectResult | null) => {
    setSelectOpen(false);
    if (!info?.path) {
      message.info('请选择文件夹');
      return;
    }

    try {
      if (importMode.current === 'workspace') {
        const res = await importWorkspace(info.path);
        if (res?.data?.added) {
          message.success(`已引入 ${res.data.added} 个项目`);
          props.forceRefreshList();
        }
      } else if (importMode.current === 'project') {
        const res = await importProject(info.path);
        if (res?.data?.added) {
          message.success('已引入项目');
          props.forceRefreshList();
        }
      }
    } catch {
      // post() 已提示错误
    }
  };

  const handleRefreshColors = async () => {
    await refreshColorCache();
    props.onColorRefresh();
    message.success('颜色缓存已刷新');
  };

  return (
    <>
      <FileSelect
        open={selectOpen}
        mode="directory"
        title={importMode.current === 'workspace' ? '选择工作区文件夹' : '选择项目文件夹'}
        onClose={() => setSelectOpen(false)}
        onOK={handleSelectOK}
      />
      <div className={styles.HeaderBox}>
        <Button onClick={() => openImport('workspace')}>
          <FolderAddOutlined /> 引入工作区
        </Button>
        <Button onClick={() => openImport('project')}>
          <FolderOpenOutlined /> 引入项目
        </Button>
        <Button onClick={() => { props.forceRefreshList() }}>
          <SyncOutlined /> 同步项目
        </Button>
        <Button onClick={handleRefreshColors}>
          <BgColorsOutlined /> 刷新颜色缓存
        </Button>
      </div>
    </>
  );
}

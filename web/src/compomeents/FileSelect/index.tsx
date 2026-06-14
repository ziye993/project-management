import { useEffect, useMemo, useState } from "react";
import Modal from "../../UiComponents/Modal";
import { getFileList } from "../../server/file";
import styles from './index.module.less';
import { FileOutlined, FolderOpenOutlined, CheckOutlined } from "@ant-design/icons";

export interface FileSelectResult {
  path: string;
  pathArray: string[];
  isDirectory: boolean;
  name?: string;
}

interface FileSelectProps {
  open: boolean;
  onClose: () => void;
  onOK: (info: FileSelectResult | null) => void;
  mode?: 'directory' | 'all';
  title?: string;
  initialAbsPath?: string;
}

function sortFilesAndFolders(items: any[]) {
  return [...items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

function formatPathDisplay(pathArray: string[], absPath?: string) {
  if (absPath) return absPath;
  if (!pathArray.length) return '此电脑';
  if (pathArray.length === 1 && pathArray[0].length === 1) {
    return `${pathArray[0]}:\\`;
  }
  return pathArray.join('/');
}

export default function FileSelect(props: FileSelectProps) {
  const { mode = 'all', title = '选择路径' } = props;
  const [list, setList] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentAbsPath, setCurrentAbsPath] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<FileSelectResult | null>(null);

  const visibleList = useMemo(() => {
    if (mode === 'directory') {
      return list.filter(item => item.isDirectory);
    }
    return list;
  }, [list, mode]);

  const loadList = async (pathArray?: string[], absPath?: string) => {
    const res = await getFileList({ path: pathArray, absPath });
    const items = sortFilesAndFolders(res.data || []);
    setList(items);
    setCurrentPath(res.currentPath || pathArray || []);
    setCurrentAbsPath(res.currentAbsPath || absPath || '');
    setSelectedFolder(null);
  };

  const goParent = async () => {
    if (!currentPath.length) return;
    const parent = currentPath.slice(0, -1);
    await loadList(parent.length ? parent : undefined);
  };

  const openFolder = async (item: any) => {
    if (!item?.isDirectory) return;
    if (item.path) {
      await loadList(item.pathArray?.length ? item.pathArray : undefined, item.path);
    }
  };

  const selectFolder = (item: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!item?.isDirectory) return;
    setSelectedFolder({
      path: item.path,
      pathArray: item.pathArray || [],
      isDirectory: true,
      name: item.name,
    });
  };

  const selectCurrentFolder = () => {
    if (!currentAbsPath) return;
    setSelectedFolder({
      path: currentAbsPath,
      pathArray: currentPath,
      isDirectory: true,
      name: currentPath[currentPath.length - 1] || currentAbsPath,
    });
  };

  const handleItemClick = (item: any) => {
    if (item.isDirectory) {
      openFolder(item);
      return;
    }
    if (mode === 'all') {
      setSelectedFolder({
        path: item.path,
        pathArray: item.pathArray || [],
        isDirectory: false,
        name: item.name,
      });
    }
  };

  const buildCurrentSelection = (): FileSelectResult | null => {
    if (selectedFolder?.path) return selectedFolder;
    if (mode === 'directory' && currentAbsPath) {
      return {
        path: currentAbsPath,
        pathArray: currentPath,
        isDirectory: true,
        name: currentPath[currentPath.length - 1] || currentAbsPath,
      };
    }
    return null;
  };

  const handleOK = () => {
    props.onOK(buildCurrentSelection());
  };

  useEffect(() => {
    if (!props.open) {
      setList([]);
      setCurrentPath([]);
      setCurrentAbsPath('');
      setSelectedFolder(null);
    } else if (props.initialAbsPath) {
      loadList(undefined, props.initialAbsPath);
    } else {
      loadList();
    }
  }, [props.open, props.initialAbsPath]);

  return (
    <Modal width="50vw" title={title} open={props.open} onClose={props.onClose} onOK={handleOK}>
      <div className={styles.box}>
        <div className={styles.toolbar}>
          <span className={styles.currentPath} title={currentAbsPath || formatPathDisplay(currentPath)}>
            当前：{formatPathDisplay(currentPath, currentAbsPath)}
          </span>
          {mode === 'directory' && currentAbsPath && (
            <button type="button" className={styles.currentBtn} onClick={selectCurrentFolder}>
              <CheckOutlined /> 选择当前文件夹
            </button>
          )}
          {selectedFolder && (
            <span className={styles.selectedHint}>
              已选中：{selectedFolder.name || selectedFolder.path}
            </span>
          )}
        </div>
        <ul>
          <li key="parent" className={styles.value} onClick={goParent}>
            <FolderOpenOutlined />
            <span>上级目录</span>
          </li>
          {visibleList.map((item, index) => (
            <li
              key={`${item.path}-${index}`}
              className={`${styles.value} ${selectedFolder?.path === item.path ? styles.checkItem : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {item.isDirectory ? <FolderOpenOutlined /> : <FileOutlined />}
              <span className={styles.itemName}>{item.name}</span>
              {mode === 'directory' && item.isDirectory && (
                <button
                  type="button"
                  className={styles.selectBtn}
                  onClick={(e) => selectFolder(item, e)}
                >
                  选中
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

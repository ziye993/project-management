import ToolPageLayout, { shellStyles } from '../../../compomeents/ToolPageLayout';
import styles from './index.module.less'
import FileSelect, { type FileSelectResult } from '../../../compomeents/FileSelect';
import { useEffect, useRef, useState } from 'react';
import message from '../../../UiComponents/Modal/message';
import {
  getConfig,
  setCommandSortOrder,
  setFileUploadPath,
  setMockFieldDefaults,
  setMovUploadPath,
  setPicUploadPath,
  setPublicBaseUrl,
} from '../../../server/setConfig';
import {
  EMPTY_MOCK_FIELD_DEFAULTS,
  mockFieldDefaultsFromConfig,
  type MockFieldDefaults,
} from '../../../type/mockDefaults';

type ConfigState = {
  picUploadPath?: string;
  movUploadPath?: string;
  fileUploadPath?: string;
  publicBaseUrl?: string;
  commandSortOrder?: string[];
  filesRoot?: string;
  mockFieldDefaults?: MockFieldDefaults;
};

export default function ConfigHome() {
  const [selectFileOpen, setSelectFileOpen] = useState(false);
  const [config, setConfigState] = useState<ConfigState>({});
  const [publicUrl, setPublicUrl] = useState('');
  const [commandSortText, setCommandSortText] = useState('');
  const [mockDefaults, setMockDefaults] = useState<MockFieldDefaults>(EMPTY_MOCK_FIELD_DEFAULTS);
  const apiFun = useRef<(param: { uploadPath: string }) => Promise<any>>(async () => ({}));
  const filesRoot = config.filesRoot;

  const loadConfig = async () => {
    const res = await getConfig();
    if (res?.data) {
      setConfigState(res.data);
      setPublicUrl(res.data.publicBaseUrl || '');
      setCommandSortText((res.data.commandSortOrder || ['dev', 'start', 'build', 'server', 'preview']).join('\n'));
      setMockDefaults(mockFieldDefaultsFromConfig(res.data.mockFieldDefaults));
    }
  };

  const onOK = async (pathInfo: FileSelectResult | null) => {
    setSelectFileOpen(false);
    if (!pathInfo?.path) {
      message.info("请选择文件夹");
      return;
    }
    const res = await apiFun.current({ uploadPath: pathInfo.path });
    if (!res?.success) return;
    message.success('路径已更新');
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const displayPath = (p?: string) => p || '未设置';

  return (
    <ToolPageLayout className={styles.box}>
      <FileSelect
        open={selectFileOpen}
        mode="directory"
        title="选择存储文件夹"
        initialAbsPath={filesRoot}
        onClose={() => setSelectFileOpen(false)}
        onOK={onOK}
      />
      <div className={styles.content}>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>上传路径</span>
          <p className={styles.hint}>默认使用项目 data/files 目录，可按需修改</p>
          <div className={styles.configItemContent}>
            <ul>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setPicUploadPath }}>
                <span>照片上传路径</span>
                <span className={styles.value} title={config.picUploadPath}>{displayPath(config.picUploadPath)}</span>
              </li>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setMovUploadPath }}>
                <span>影视上传路径</span>
                <span className={styles.value} title={config.movUploadPath}>{displayPath(config.movUploadPath)}</span>
              </li>
              <li onClick={() => { setSelectFileOpen(true); apiFun.current = setFileUploadPath }}>
                <span>文件上传路径</span>
                <span className={styles.value} title={config.fileUploadPath}>{displayPath(config.fileUploadPath)}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>项目指令排序</span>
          <p className={styles.hint}>每行一个指令名，排在前面的指令会固定显示在项目页最左侧，横向滚动时不会移动</p>
          <div className={styles.sortOrderBox}>
            <textarea
              className={styles.sortTextarea}
              value={commandSortText}
              onChange={e => setCommandSortText(e.target.value)}
              placeholder={'dev\nstart\nbuild\nserver\npreview'}
              rows={6}
            />
            <button
              type="button"
              className={styles.saveBtn}
              onClick={async () => {
                const commandSortOrder = commandSortText
                  .split('\n')
                  .map(s => s.trim())
                  .filter(Boolean);
                await setCommandSortOrder({ commandSortOrder });
                message.success('指令排序已保存');
                loadConfig();
              }}
            >保存</button>
          </div>
        </div>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>访问链接</span>
          <p className={styles.hint}>配置公网域名后，图片/视频链接会额外生成线上地址（如 https://example.com）</p>
          <div className={styles.publicUrlRow}>
            <input
              className={styles.input}
              value={publicUrl}
              onChange={e => setPublicUrl(e.target.value)}
              placeholder="https://your-domain.com"
            />
            <button
              type="button"
              className={styles.saveBtn}
              onClick={async () => {
                await setPublicBaseUrl({ publicBaseUrl: publicUrl });
                message.success('已保存');
                loadConfig();
              }}
            >保存</button>
          </div>
        </div>
        <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
          <span className={styles.configItemTitle}>Mock 公共字段默认值</span>
          <p className={styles.hint}>
            数据 Mock 与 Swagger 试请求未单独配置的字段将使用此处默认值；留空则仍按类型/schema 生成。message 同时作用于 msg / message 字段；分页字段 current / size 等也会匹配 result 下的同名配置。
          </p>
          <div className={styles.mockDefaultsForm}>
            <label className={styles.mockFieldRow}>
              <span>code</span>
              <input
                className={styles.input}
                type="number"
                value={mockDefaults.code ?? ''}
                onChange={(e) => setMockDefaults((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="如 0"
              />
            </label>
            <label className={styles.mockFieldRow}>
              <span>success</span>
              <select
                className={styles.input}
                value={String(mockDefaults.success ?? '')}
                onChange={(e) => setMockDefaults((prev) => ({ ...prev, success: e.target.value }))}
              >
                <option value="">留空（随机）</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label className={styles.mockFieldRow}>
              <span>message</span>
              <input
                className={styles.input}
                type="text"
                value={mockDefaults.message ?? ''}
                onChange={(e) => setMockDefaults((prev) => ({ ...prev, message: e.target.value }))}
                placeholder='如 "" 或 ok'
              />
            </label>
            <div className={styles.mockFieldGroup}>
              <span className={styles.mockFieldGroupTitle}>result 分页（字段存在时生效）</span>
              {(['size', 'total', 'current', 'pages'] as const).map((key) => (
                <label key={key} className={styles.mockFieldRow}>
                  <span>{key}</span>
                  <input
                    className={styles.input}
                    type="number"
                    value={mockDefaults.result?.[key] ?? ''}
                    onChange={(e) =>
                      setMockDefaults((prev) => ({
                        ...prev,
                        result: { ...prev.result, [key]: e.target.value },
                      }))
                    }
                    placeholder="留空则随机"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={async () => {
                await setMockFieldDefaults({ mockFieldDefaults: mockDefaults });
                message.success('Mock 默认值已保存');
                loadConfig();
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
}

import ToolPageLayout, { shellStyles } from '@/components/ToolPageLayout';
import styles from './index.module.less'
import FileSelect, { type FileSelectResult } from '@/components/FileSelect';
import ConfigAnchorNav, { type ConfigAnchorItem } from '@/components/ConfigAnchorNav';
import CustomCommandModal from '@/components/CustomCommandModal';
import { useEffect, useMemo, useRef, useState } from 'react';
import message from '@/components/ui/Modal/message';
import { useAuth } from '@/hooks/useAuth';
import {
  getConfig,
  setCommandSortOrder,
  setCustomProjectCommands,
  setFileUploadPath,
  setMockFieldDefaults,
  setModuleAccess,
  setMovUploadPath,
  setPicUploadPath,
  setPublicBaseUrl,
} from '@/api/setConfig';
import {
  CONFIGURABLE_MODULES,
  moduleAccessFromModes,
  modesFromModuleAccess,
  type ModuleAccessMode,
  type ModuleAccessConfig,
} from '../../../constants/moduleAccess';
import {
  createCustomCommandId,
  type CustomProjectCommand,
} from '../../../constants/customCommands';
import {
  EMPTY_MOCK_FIELD_DEFAULTS,
  mockFieldDefaultsFromConfig,
  type MockFieldDefaults,
} from '../../../type/mockDefaults';
import {
  type ImageCryptoSettings,
} from '../../../type/imageCryptoSettings';
import ImageCryptoSettingsSection from './ImageCryptoSettingsSection';

type ConfigState = {
  picUploadPath?: string;
  movUploadPath?: string;
  fileUploadPath?: string;
  publicBaseUrl?: string;
  commandSortOrder?: string[];
  customProjectCommands?: CustomProjectCommand[];
  filesRoot?: string;
  mockFieldDefaults?: MockFieldDefaults;
  moduleAccess?: ModuleAccessConfig;
  imageCryptoSettings?: ImageCryptoSettings;
};

const CONFIG_SECTIONS: ConfigAnchorItem[] = [
  { key: 'uploadPaths', label: '上传路径' },
  { key: 'customCommands', label: '自定义项目指令' },
  { key: 'commandSort', label: '项目指令排序' },
  { key: 'publicUrl', label: '访问链接' },
  { key: 'moduleAccess', label: '模块访问控制' },
  { key: 'mockDefaults', label: 'Mock 默认值' },
  { key: 'imageCrypto', label: '图片加解密' },
];

export default function ConfigHome() {
  const { refresh: refreshAuth } = useAuth();
  const [selectFileOpen, setSelectFileOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(CONFIG_SECTIONS[0].key);
  const [config, setConfigState] = useState<ConfigState>({});
  const [publicUrl, setPublicUrl] = useState('');
  const [commandSortText, setCommandSortText] = useState('');
  const [customCommands, setCustomCommands] = useState<CustomProjectCommand[]>([]);
  const [mockDefaults, setMockDefaults] = useState<MockFieldDefaults>(EMPTY_MOCK_FIELD_DEFAULTS);
  const [moduleModes, setModuleModes] = useState<Record<string, ModuleAccessMode>>(() =>
    modesFromModuleAccess(null),
  );
  const apiFun = useRef<(param: { uploadPath: string }) => Promise<any>>(async () => ({}));
  const filesRoot = config.filesRoot;

  const loadConfig = async () => {
    const res = await getConfig();
    if (res?.data) {
      setConfigState(res.data);
      setPublicUrl(res.data.publicBaseUrl || '');
      setCommandSortText((res.data.commandSortOrder || ['dev', 'start', 'build', 'server', 'preview']).join('\n'));
      setCustomCommands(res.data.customProjectCommands || []);
      setMockDefaults(mockFieldDefaultsFromConfig(res.data.mockFieldDefaults));
      setModuleModes(modesFromModuleAccess(res.data.moduleAccess));
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

  const saveCustomCommands = async (next: CustomProjectCommand[]) => {
    await setCustomProjectCommands({ customProjectCommands: next });
    setCustomCommands(next);
    message.success('自定义指令已保存');
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const displayPath = (p?: string) => p || '未设置';

  const sectionContent = useMemo(() => {
    switch (activeSection) {
      case 'uploadPaths':
        return (
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
        );
      case 'customCommands':
        return (
          <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
            <span className={styles.configItemTitle}>自定义项目指令</span>
            <p className={styles.hint}>
              配置后显示在项目页第一行系统指令区，在当前选中项目目录下执行。支持任意 shell 命令。
            </p>
            <div className={styles.customCommandBox}>
              {customCommands.length === 0 && (
                <p className={styles.emptyHint}>暂无自定义指令</p>
              )}
              {customCommands.map(item => (
                <div key={item.id} className={styles.customCommandRow}>
                  <div className={styles.customCommandMeta}>
                    <span className={styles.customCommandTitle}>{item.title}</span>
                    <code className={styles.customCommandText}>{item.command}</code>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => saveCustomCommands(customCommands.filter(cmd => cmd.id !== item.id))}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setCustomModalOpen(true)}
              >
                新增自定义项目指令
              </button>
            </div>
          </div>
        );
      case 'commandSort':
        return (
          <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
            <span className={styles.configItemTitle}>项目指令排序</span>
            <p className={styles.hint}>每行一个指令名，排在前面的指令会固定显示在项目页第二行最左侧，横向滚动时不会移动</p>
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
        );
      case 'publicUrl':
        return (
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
        );
      case 'moduleAccess':
        return (
          <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
            <span className={styles.configItemTitle}>模块访问控制</span>
            <p className={styles.hint}>
              仅配置需要登录或不展示的模块；默认展示的模块无需设置。日志模块始终展示，进入后需登录；权限管理不在此配置内。
            </p>
            <div className={styles.moduleAccessList}>
              {CONFIGURABLE_MODULES.map(item => (
                <div key={item.key} className={styles.moduleAccessRow}>
                  <span className={styles.moduleAccessName}>{item.name}</span>
                  <select
                    className={styles.moduleAccessSelect}
                    value={moduleModes[item.key] ?? 'default'}
                    onChange={e => setModuleModes(prev => ({
                      ...prev,
                      [item.key]: e.target.value as ModuleAccessMode,
                    }))}
                  >
                    <option value="default">默认展示</option>
                    <option value="requireLogin">需登录</option>
                    <option value="hidden">不展示</option>
                  </select>
                </div>
              ))}
              <button
                type="button"
                className={styles.saveBtn}
                onClick={async () => {
                  await setModuleAccess({ moduleAccess: moduleAccessFromModes(moduleModes) });
                  message.success('模块访问配置已保存');
                  await loadConfig();
                  await refreshAuth();
                }}
              >
                保存
              </button>
            </div>
          </div>
        );
      case 'mockDefaults':
        return (
          <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
            <span className={styles.configItemTitle}>Mock 公共字段默认值</span>
            <p className={styles.hint}>
              数据 Mock 与 Swagger 试请求未单独配置的字段将使用此处默认值；留空则仍按类型/schema 生成。message 同时作用于 msg / message 字段；分页字段 pageNo / pageSize / total 会匹配响应中任意层级的同名字段（也兼容 current / size 等别名）。
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
                <span className={styles.mockFieldGroupTitle}>分页字段（字段存在时生效）</span>
                {(['pageNo', 'pageSize', 'total'] as const).map((key) => (
                  <label key={key} className={styles.mockFieldRow}>
                    <span>{key}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={mockDefaults.pagination?.[key] ?? ''}
                      onChange={(e) =>
                        setMockDefaults((prev) => ({
                          ...prev,
                          pagination: { ...prev.pagination, [key]: e.target.value },
                        }))
                      }
                      placeholder={key === 'pageNo' ? '如 1' : key === 'pageSize' ? '如 10' : '如 100'}
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
        );
      case 'imageCrypto':
        return (
          <div className={`${shellStyles.panel} ${styles.configItemBox}`}>
            <span className={styles.configItemTitle}>图片加解密</span>
            <p className={styles.hint}>模块内 Canvas 处理、水印、智能显形与双图合并默认参数</p>
            <ImageCryptoSettingsSection
              initial={config.imageCryptoSettings}
              onSaved={loadConfig}
            />
          </div>
        );
      default:
        return null;
    }
  }, [
    activeSection,
    commandSortText,
    config.fileUploadPath,
    config.movUploadPath,
    config.picUploadPath,
    config.imageCryptoSettings,
    customCommands,
    mockDefaults,
    moduleModes,
    publicUrl,
    refreshAuth,
  ]);

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
      <CustomCommandModal
        open={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onConfirm={async ({ title, command }) => {
          const next = [
            ...customCommands,
            { id: createCustomCommandId(title), title, command },
          ];
          await saveCustomCommands(next);
        }}
      />
      <div className={styles.layout}>
        <aside className={styles.anchorCol}>
          <ConfigAnchorNav
            items={CONFIG_SECTIONS}
            activeKey={activeSection}
            onChange={setActiveSection}
          />
        </aside>
        <div className={styles.panelCol}>
          {sectionContent}
        </div>
      </div>
    </ToolPageLayout>
  );
}

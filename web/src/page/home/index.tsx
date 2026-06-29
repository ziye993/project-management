import { useMemo, useState } from 'react';
import UserHeader from '../../compomeents/UserHeader';
import ShutdownButton from '../../compomeents/ShutdownButton';
import LoginModal from '../../compomeents/LoginModal';
import { useAuth } from '../../hooks/useAuth';
import styles from './index.module.less';
import {
  AlignLeftOutlined,
  BarChartOutlined,
  CodeOutlined,
  DesktopOutlined,
  FundViewOutlined,
  MessageOutlined,
  PartitionOutlined,
  PercentageOutlined,
  PlayCircleOutlined,
  RightOutlined,
  ApiOutlined,
  FileTextOutlined,
  BuildOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../Router';
import { logout } from '../../server/user';
import { resolveEffectiveLogApiBaseUrl } from '../../utils/logApiBase';

interface EntryItem {
  id: number;
  moduleKey: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  path: string;
  accent: string;
}

const entries: EntryItem[] = [
  { id: 7, moduleKey: 'project', name: '代码管理', desc: '管理本地项目、运行脚本与查看日志', icon: <CodeOutlined />, path: '/project', accent: 'indigo' },
  { id: 2, moduleKey: 'image', name: '图像', desc: '上传图片、预览与复制访问链接', icon: <FundViewOutlined />, path: '/image', accent: 'sky' },
  { id: 3, moduleKey: 'television', name: '影视', desc: '视频上传、切片存储与在线播放', icon: <DesktopOutlined />, path: '/television', accent: 'violet' },
  { id: 4, moduleKey: 'config', name: '系统配置', desc: '存储路径、公网链接等全局设置', icon: <AlignLeftOutlined />, path: '/config', accent: 'amber' },
  { id: 5, moduleKey: 'serverInfo', name: '服务器状态', desc: '查看 CPU、内存、磁盘等运行指标', icon: <BarChartOutlined />, path: '/serverInfo', accent: 'mint' },
  { id: 6, moduleKey: 'LANSharing', name: '局域网共享', desc: '共享文件夹上传、下载与管理', icon: <PartitionOutlined />, path: '/LANSharing', accent: 'cyan' },
  { id: 9, moduleKey: 'game', name: '游戏', desc: '本地小游戏合集，休闲放松', icon: <PlayCircleOutlined />, path: '/game', accent: 'orange' },
  { id: 8, moduleKey: 'localChat', name: '局域网对话', desc: '纯匿名局域网聊天，支持图片与视频', icon: <MessageOutlined />, path: '/localChat', accent: 'rose' },
  { id: 16, moduleKey: 'swagger', name: 'swagger', desc: '更加可视化和简单的weagger文档', icon: <PercentageOutlined />, path: '/swagger', accent: 'swagger' },
  { id: 10, moduleKey: 'dataMock', name: '数据 Mock', desc: '根据 Swagger 文档启动 Mock 服务，按字段规则返回 JSON', icon: <ApiOutlined />, path: '/dataMock', accent: 'teal' },
  { id: 11, moduleKey: 'log', name: '日志管理', desc: '多租户日志收集、查询与 Key 管理', icon: <FileTextOutlined />, path: '/log', accent: 'slate' },
  { id: 12, moduleKey: 'planeEditor', name: '平面布局编辑器', desc: '设备相对位置平面拖拽编辑，支持多主题', icon: <BuildOutlined />, path: '/planeEditor', accent: 'indigo' },
  { id: 13, moduleKey: 'auth', name: '权限管理', desc: '用户账号与组织/项目授权', icon: <SafetyCertificateOutlined />, path: '/auth', accent: 'rose' },
];

export default function ZiyeHome() {
  const { push } = useNavigate();
  const { visibleModules, loading, isAuthenticated, user, logApiBaseUrl, refresh } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const data = useMemo(
    () => entries.filter(item => visibleModules.includes(item.moduleKey)),
    [visibleModules],
  );

  const handleLogout = async () => {
    const apiBase = resolveEffectiveLogApiBaseUrl(logApiBaseUrl);
    try {
      await logout(apiBase);
    } catch { /* ignore */ }
    await refresh();
  };

  const headerActions = (
    <>
      {isAuthenticated ? (
        <button type="button" className={styles.authBtn} onClick={handleLogout}>
          <LogoutOutlined /> {user?.username} 退出
        </button>
      ) : (
        <button type="button" className={styles.authBtn} onClick={() => setLoginOpen(true)}>
          <LoginOutlined /> 登录
        </button>
      )}
      <ShutdownButton />
    </>
  );

  return (
    <div className={styles.box}>
      <div className={styles.ambientBg} aria-hidden />
      <div className={styles.pageInner}>
        <UserHeader className={styles.userHeader} actions={headerActions} />
        <main className={styles.main}>
          <section className={styles.grid}>
            {!loading && data.map(item => (
              <button
                key={item.moduleKey}
                type="button"
                className={styles.card}
                data-accent={item.accent}
                onClick={() => push(item.path)}
              >
                <span className={styles.iconWrap}>{item.icon}</span>
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{item.name}</span>
                  <span className={styles.cardDesc}>{item.desc}</span>
                </span>
                <RightOutlined className={styles.cardArrow} />
              </button>
            ))}
            {!loading && !data.length && (
              <p className={styles.emptyHint}>当前访问通道下无可用模块</p>
            )}
          </section>
        </main>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import UserHeader from '../../compomeents/UserHeader';
import ShutdownButton from '../../compomeents/ShutdownButton';
import styles from './index.module.less';
import {
  AlignLeftOutlined,
  BarChartOutlined,
  CodeOutlined,
  DesktopOutlined,
  FundViewOutlined,
  MessageOutlined,
  PartitionOutlined, PercentageOutlined,
  PlayCircleOutlined,
  RightOutlined,
  ApiOutlined,
  FileTextOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import { useNavigate } from '../../Router';

interface EntryItem {
  id: number;
  name: string;
  desc: string;
  icon: React.ReactNode;
  path: string;
  accent: string;
}

const entries: EntryItem[] = [
  {
    id: 7,
    name: '代码管理',
    desc: '管理本地项目、运行脚本与查看日志',
    icon: <CodeOutlined />,
    path: '/project',
    accent: 'indigo',
  },
  {
    id: 2,
    name: '图像',
    desc: '上传图片、预览与复制访问链接',
    icon: <FundViewOutlined />,
    path: '/image',
    accent: 'sky',
  },
  {
    id: 3,
    name: '影视',
    desc: '视频上传、切片存储与在线播放',
    icon: <DesktopOutlined />,
    path: '/television',
    accent: 'violet',
  },
  {
    id: 4,
    name: '系统配置',
    desc: '存储路径、公网链接等全局设置',
    icon: <AlignLeftOutlined />,
    path: '/config',
    accent: 'amber',
  },
  {
    id: 5,
    name: '服务器状态',
    desc: '查看 CPU、内存、磁盘等运行指标',
    icon: <BarChartOutlined />,
    path: '/serverInfo',
    accent: 'mint',
  },
  {
    id: 6,
    name: '局域网共享',
    desc: '共享文件夹上传、下载与管理',
    icon: <PartitionOutlined />,
    path: '/LANSharing',
    accent: 'cyan',
  },
  {
    id: 9,
    name: '游戏',
    desc: '本地小游戏合集，休闲放松',
    icon: <PlayCircleOutlined />,
    path: '/game',
    accent: 'orange',
  },
  {
    id: 8,
    name: '局域网对话',
    desc: '纯匿名局域网聊天，支持图片与视频',
    icon: <MessageOutlined />,
    path: '/localChat',
    accent: 'rose',
  },
  {
    id: 6,
    name: 'swagger',
    desc: '更加可视化和简单的weagger文档',
    icon: <PercentageOutlined />,
    path: '/swagger',
    accent: 'swagger',
  },
  {
    id: 10,
    name: '数据 Mock',
    desc: '根据 Swagger 文档启动 Mock 服务，按字段规则返回 JSON',
    icon: <ApiOutlined />,
    path: '/dataMock',
    accent: 'teal',
  },
  {
    id: 11,
    name: '日志管理',
    desc: '多租户日志收集、查询与 Key 管理',
    icon: <FileTextOutlined />,
    path: '/log',
    accent: 'slate',
  },
  {
    id: 12,
    name: '平面布局编辑器',
    desc: '设备相对位置平面拖拽编辑，支持多主题',
    icon: <BuildOutlined />,
    path: '/planeEditor',
    accent: 'indigo',
  },
];

export default function ZiyeHome() {
  const [data, setData] = useState<EntryItem[]>([]);
  const { push } = useNavigate();

  useEffect(() => {
    setData(entries);
  }, []);

  return (
    <div className={styles.box}>
      <div className={styles.ambientBg} aria-hidden />
      <div className={styles.pageInner}>
        <UserHeader className={styles.userHeader} actions={<ShutdownButton />} />
        <main className={styles.main}>
          {/*<section className={styles.hero}>*/}
          {/*  <p className={styles.heroTag}>本地工作台</p>*/}
          {/*  <h1 className={styles.heroTitle}>项目管理</h1>*/}
          {/*  <p className={styles.heroDesc}>选择一个模块，开始你的本地开发与管理</p>*/}
          {/*</section>*/}
          <section className={styles.grid}>
            {data.map(item => (
              <button
                key={item.id}
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
          </section>
        </main>
      </div>
    </div>
  );
}

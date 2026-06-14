import { useEffect, useState } from 'react'
import UserHeader from '../../compomeents/UserHeader'
import styles from './index.module.less'
import { AlignLeftOutlined, BarChartOutlined, CodeOutlined, DesktopOutlined, FundViewOutlined, PartitionOutlined } from '@ant-design/icons'
import { useNavigate } from '../../Router'

const _data = {
    data: [{
        id: 7,
        name: '代码管理',
        icon: <CodeOutlined />,
        code: 'codeMenege',
        path: '/project',
    }, {
        id: 2,
        name: '图像',
        code: 'image',
        icon: <FundViewOutlined />,
        path: '/image',
    }, {
        id: 3,
        name: '影视',
        icon: <DesktopOutlined />,
        code: 'television',
        path: '/television',
    }, {
        id: 4,
        name: '系统配置',
        icon: <AlignLeftOutlined />,
        code: 'config',
        path: '/config',
    }, {
        id: 5,
        name: '服务器状态信息',
        icon: <BarChartOutlined />,
        code: 'serverInfo',
        path: '/serverInfo',
    }, {
        id: 6,
        name: '局域网共享',
        icon: <PartitionOutlined />,
        code: 'LANSharing',
        path: '/LANSharing',
    },]
}

export default function ZiyeHome() {
    const [data, setData] = useState<any[]>([]);
    const { push } = useNavigate();

    useEffect(() => { setData(_data.data || []) }, [])
    return <div className={styles.box}>
        <div className={styles.content}>
            <UserHeader />
            <div className={styles.fun}>
                {data.map((_, index) => {
                    return <div key={index} className={styles.funItem} onClick={() => { push(_.path) }}>
                        {_.icon}
                        <span>{_.name}</span>
                    </div>
                })}
            </div>
        </div>
    </div>
}

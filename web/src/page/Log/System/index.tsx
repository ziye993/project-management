import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useNavigate } from '@/Router';
import { useAuth } from '@/hooks/useAuth';
import { useLogApi } from '@/hooks/useLogApi';
import shared from '../shared.module.less';

interface AuditRow {
  id: number;
  userId?: number;
  username?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detailPreview?: string;
  clientIp?: string;
  channel?: string;
  createTime: string;
}

export default function LogSystem() {
  const logApi = useLogApi();
  const { isSuperAdmin } = useAuth();
  const { push } = useNavigate();

  const [list, setList] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [action, setAction] = useState('');
  const [username, setUsername] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      push('/log/home');
    }
  }, [isSuperAdmin, push]);

  const load = useCallback(async (p = page) => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const res = await logApi.listAuditLogs({
        action: action || undefined,
        username: username || undefined,
        keyword: keyword || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        page: p,
        pageSize,
      });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [action, username, keyword, startTime, endTime, page, pageSize, logApi, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) void load(1);
  }, [isSuperAdmin]);

  const openDetail = async (id: number) => {
    const res = await logApi.getAuditDetail(id);
    setDetail(res.data);
    setDetailOpen(true);
  };

  if (!isSuperAdmin) {
    return <p className={shared.empty}>仅平台超管可查看系统日志</p>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div className={shared.field}>
          <label>操作</label>
          <input value={action} onChange={e => setAction(e.target.value)} placeholder="如 grant / org.create" />
        </div>
        <div className={shared.field}>
          <label>用户</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
        </div>
        <div className={shared.field}>
          <label>开始时间</label>
          <input
            type="datetime-local"
            value={startTimeInput}
            onChange={e => {
              setStartTimeInput(e.target.value);
              setStartTime(e.target.value ? `${e.target.value.replace('T', ' ')}:00` : '');
            }}
          />
        </div>
        <div className={shared.field}>
          <label>结束时间</label>
          <input
            type="datetime-local"
            value={endTimeInput}
            onChange={e => {
              setEndTimeInput(e.target.value);
              setEndTime(e.target.value ? `${e.target.value.replace('T', ' ')}:59` : '');
            }}
          />
        </div>
        <div className={`${shared.field} ${shared.fieldWide}`}>
          <label>关键词</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="action / target / detail" />
        </div>
        <button type="button" className={shared.btn} onClick={() => load(1)} disabled={loading}>
          查询
        </button>
      </div>

      <div className={shared.panel}>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>操作</th>
                <th>目标</th>
                <th>摘要</th>
                <th>通道</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id} className={shared.rowClick} onClick={() => openDetail(row.id)}>
                  <td>{row.createTime}</td>
                  <td>{row.username || row.userId || '-'}</td>
                  <td>{row.action}</td>
                  <td>{[row.targetType, row.targetId].filter(Boolean).join(':') || '-'}</td>
                  <td>{row.detailPreview || '-'}</td>
                  <td>{row.channel || '-'}</td>
                  <td>{row.clientIp || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <div className={shared.empty}>{loading ? '加载中...' : '暂无数据'}</div>}
        </div>
        <div className={shared.pagination}>
          <span>共 {total} 条，第 {page} / {totalPages} 页</span>
          <div className={shared.paginationBtns}>
            <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
            <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={page >= totalPages} onClick={() => load(page + 1)}>下一页</button>
          </div>
        </div>
      </div>

      <Modal
        open={detailOpen}
        title={`系统日志 #${detail?.id || ''}`}
        onClose={() => setDetailOpen(false)}
        onOK={() => setDetailOpen(false)}
        width="640px"
      >
        {detail && (
          <>
            <div className={shared.detailSection}>
              <h4>基本信息</h4>
              <p>{detail.createTime} · {detail.username || '-'} · {detail.action}</p>
              <p>目标：{[detail.targetType, detail.targetId].filter(Boolean).join(' / ') || '-'}</p>
              <p>IP：{detail.clientIp || '-'} · 通道：{detail.channel || '-'}</p>
            </div>
            <div className={shared.detailSection}>
              <h4>详情</h4>
              <pre>{JSON.stringify(detail.detail, null, 2)}</pre>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

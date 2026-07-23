import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  type LogItem,
  type OrgItem,
  type ProjectItem,
} from '@/api/log';
import { useLogApi } from '../../../hooks/useLogApi';
import shared from '../shared.module.less';

const LEVELS = ['', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

const LEVEL_CLASS: Record<string, string> = {
  DEBUG: shared.levelDebug,
  INFO: shared.levelInfo,
  WARN: shared.levelWarn,
  ERROR: shared.levelError,
  FATAL: shared.levelFatal,
};

type ContentFormat = 'txt' | 'json' | 'markdown' | 'html';

const CONTENT_FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'txt', label: 'TXT' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
];

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatJsonContent(raw: string): { text: string; error?: string } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2) };
  } catch {
    return { text: raw, error: '内容不是合法 JSON，已按原文展示' };
  }
}

/** 轻量 Markdown → HTML（日志预览用，不做完整规格） */
function markdownToHtml(raw: string): string {
  const codeBlocks: string[] = [];
  let text = raw.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(code.replace(/^\n|\n$/g, ''))}</code></pre>`);
    return `\u0000CB${i}\u0000`;
  });

  text = escapeHtml(text);
  text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  text = text.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  text = text.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/(?:<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  text = text.replace(/\n{2,}/g, '</p><p>');
  text = text.replace(/\n/g, '<br/>');
  text = `<p>${text}</p>`;
  text = text.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)]);
  return text;
}

function LogContentView({ content, format }: { content: string; format: ContentFormat }) {
  if (format === 'json') {
    const { text, error } = formatJsonContent(content);
    return (
      <>
        {error && <p className={shared.contentFormatHint}>{error}</p>}
        <pre className={`${shared.contentView} ${shared.contentViewPre}`}>{text}</pre>
      </>
    );
  }

  if (format === 'markdown') {
    return (
      <div
        className={`${shared.contentView} ${shared.contentViewMd}`}
        dangerouslySetInnerHTML={{ __html: markdownToHtml(content || '') }}
      />
    );
  }

  if (format === 'html') {
    return (
      <div className={`${shared.contentView} ${shared.contentViewHtml}`}>
        <iframe
          title="log-html-preview"
          sandbox=""
          srcDoc={content || ''}
        />
      </div>
    );
  }

  return <pre className={`${shared.contentView} ${shared.contentViewPre}`}>{content}</pre>;
}

export default function LogQuery() {
  const logApi = useLogApi();
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [list, setList] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [orgId, setOrgId] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [level, setLevel] = useState('');
  const [module, setModule] = useState('');
  const [traceId, setTraceId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [contentFormat, setContentFormat] = useState<ContentFormat>('txt');

  useEffect(() => {
    logApi.listOrgs({ page: 1, pageSize: 500 }).then(res => {
      setOrgs(res.data?.list || []);
    }).catch(() => {});
  }, [logApi]);

  useEffect(() => {
    if (!orgId) {
      setProjects([]);
      setProjectId('');
      return;
    }
    logApi.listProjects(orgId).then(res => setProjects(res.data || [])).catch(() => {});
  }, [orgId, logApi]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await logApi.listLogs({
        orgId: orgId || undefined,
        projectId: projectId || undefined,
        level: level || undefined,
        module: module || undefined,
        traceId: traceId || undefined,
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
  }, [orgId, projectId, level, module, traceId, keyword, startTime, endTime, page, pageSize, logApi]);

  useEffect(() => {
    load(1);
  }, []);

  const openDetail = async (id: number) => {
    const res = await logApi.getLogDetail(id);
    setDetail(res.data);
    setContentFormat('txt');
    setDetailOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div className={shared.field}>
          <label>租户</label>
          <select value={orgId} onChange={e => setOrgId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">全部</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.org_name}</option>
            ))}
          </select>
        </div>
        <div className={shared.field}>
          <label>项目</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} disabled={!orgId}>
            <option value="">全部</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>
        <div className={shared.field}>
          <label>级别</label>
          <select value={level} onChange={e => setLevel(e.target.value)}>
            {LEVELS.map(l => (
              <option key={l || 'all'} value={l}>{l || '全部'}</option>
            ))}
          </select>
        </div>
        <div className={shared.field}>
          <label>模块</label>
          <input value={module} onChange={e => setModule(e.target.value)} placeholder="如 appStore" />
        </div>
        <div className={shared.field}>
          <label>Trace ID</label>
          <input value={traceId} onChange={e => setTraceId(e.target.value)} placeholder="精确匹配" />
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
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索 content / title" />
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
                <th>级别</th>
                <th>租户</th>
                <th>项目</th>
                <th>模块</th>
                <th>标题</th>
                <th>内容</th>
                <th>Trace</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id} className={shared.rowClick} onClick={() => openDetail(row.id)}>
                  <td>{row.create_time}</td>
                  <td className={LEVEL_CLASS[row.level] || ''}>{row.level}</td>
                  <td>{row.org_name || row.org_id}</td>
                  <td>{row.project_name || row.project_id}</td>
                  <td>{row.module || '-'}</td>
                  <td>{row.title || '-'}</td>
                  <td>{row.content}</td>
                  <td>{row.trace_id || '-'}</td>
                  <td>{row.client_ip || '-'}</td>
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
        title={`日志详情 #${detail?.id || ''}`}
        onClose={() => setDetailOpen(false)}
        onOK={() => setDetailOpen(false)}
        width="720px"
      >
        {detail && (
          <>
            <div className={shared.detailSection}>
              <h4>基本信息</h4>
              <p>
                {detail.create_time} · {detail.level} · {detail.org_name} / {detail.project_name}
                {detail.module ? ` · ${detail.module}` : ''}
              </p>
              {detail.title && <p>标题：{detail.title}</p>}
              {detail.trace_id && <p>Trace：{detail.trace_id}</p>}
              <p>IP：{detail.client_ip || '-'} · UA：{detail.user_agent || '-'}</p>
            </div>
            <div className={shared.detailSection}>
              <div className={shared.detailSectionHead}>
                <h4>内容</h4>
                <select
                  value={contentFormat}
                  onChange={e => setContentFormat(e.target.value as ContentFormat)}
                  aria-label="内容格式"
                >
                  {CONTENT_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <LogContentView content={detail.content || ''} format={contentFormat} />
            </div>
            {detail.data != null && (
              <div className={shared.detailSection}>
                <h4>Data JSON</h4>
                <pre>{JSON.stringify(detail.data, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@/Router';
import ToolPageLayout from '@/components/ToolPageLayout';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { useAuthApi } from '@/hooks/useAuthApi';
import shared from '@/page/Log/shared.module.less';

interface UserRow {
  id: number;
  username: string;
  email?: string;
  status: number;
  is_super_admin: number;
  create_time: string;
}

export default function AuthHome() {
  const { push } = useNavigate();
  const authApi = useAuthApi();
  const [list, setList] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterName, setFilterName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', email: '' });

  const load = useCallback(async (p = page) => {
    const res = await authApi.listUsers({
      username: filterName || undefined,
      page: p,
      pageSize: 20,
    });
    setList(res.data?.list || []);
    setTotal(res.data?.total || 0);
    setPage(p);
  }, [authApi, filterName, page]);

  useEffect(() => {
    load(1);
  }, []);

  const createUser = async () => {
    if (!form.username.trim() || !form.password) {
      message.error('请填写用户名和密码');
      return;
    }
    await authApi.createUser(form);
    message.success('用户已创建');
    setCreateOpen(false);
    setForm({ username: '', password: '', email: '' });
    load(page);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <ToolPageLayout>
      <div className={shared.page}>
        <div className={shared.toolbar}>
          <div className={`${shared.field} ${shared.fieldWide}`}>
            <label htmlFor="auth-filter">用户名</label>
            <input
              id="auth-filter"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="搜索用户名"
            />
          </div>
          <button type="button" className={shared.btn} onClick={() => load(1)}>查询</button>
          <button type="button" className={shared.btn} onClick={() => setCreateOpen(true)}>新建用户</button>
        </div>
        <p className={shared.hint} style={{ marginBottom: 12 }}>
          业务操作权限在用户「授权管理」中配置；模块显隐请到系统配置 → 模块访问控制。
        </p>

        <div className={shared.panel}>
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>状态</th>
                  <th>超管</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id}>
                    <td>{row.username}</td>
                    <td>{row.email || '-'}</td>
                    <td className={row.status === 1 ? shared.statusOn : shared.statusOff}>
                      {row.status === 1 ? '正常' : '禁用'}
                    </td>
                    <td>{row.is_super_admin ? '是' : '否'}</td>
                    <td>{row.create_time}</td>
                    <td>
                      <div className={shared.actions}>
                        <button
                          type="button"
                          className={`${shared.btn} ${shared.btnSmall}`}
                          onClick={() => push('/auth/detail', { userId: row.id })}
                        >
                          授权管理
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!list.length && <p className={shared.empty}>暂无用户</p>}
          <div className={shared.pagination}>
            <span>共 {total} 条</span>
            <div className={shared.paginationBtns}>
              <button type="button" className={shared.btnGhost} disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
              <span>{page} / {totalPages}</span>
              <button type="button" className={shared.btnGhost} disabled={page >= totalPages} onClick={() => load(page + 1)}>下一页</button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={createOpen} title="新建用户" onClose={() => setCreateOpen(false)} onOK={createUser} width="420px">
        <div className={shared.formGrid}>
          <div className={shared.formField}>
            <label htmlFor="auth-username">用户名</label>
            <input id="auth-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label htmlFor="auth-password">密码</label>
            <input id="auth-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label htmlFor="auth-email">邮箱</label>
            <input id="auth-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
      </Modal>
    </ToolPageLayout>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@/Router';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useAuth } from '@/hooks/useAuth';
import shared from '@/page/Log/shared.module.less';

interface UserRow {
  id: number;
  username: string;
  email?: string;
  status: number;
  is_super_admin: number;
  create_time: string;
}

interface ScopeOrg {
  id: number;
  org_name: string;
}

interface ScopeProject {
  id: number;
  org_id: number;
  project_name: string;
}

export default function AuthHome() {
  const { push } = useNavigate();
  const authApi = useAuthApi();
  const { isSuperAdmin, hasCapability } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterName, setFilterName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    orgId: '' as number | '',
    projectId: '' as number | '',
  });
  const [orgs, setOrgs] = useState<ScopeOrg[]>([]);
  const [projects, setProjects] = useState<ScopeProject[]>([]);
  const [createUserOrgIds, setCreateUserOrgIds] = useState<number[]>([]);

  const canCreate = isSuperAdmin || hasCapability('auth.user.create');

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

  useEffect(() => {
    if (!createOpen) return;
    authApi.capabilityScopes().then(res => {
      const ids: number[] = res.data?.createUserOrgIds || [];
      setCreateUserOrgIds(ids);
      const allOrgs: ScopeOrg[] = res.data?.orgs || [];
      setOrgs(isSuperAdmin ? allOrgs : allOrgs.filter(o => ids.includes(Number(o.id))));
      setProjects(res.data?.projects || []);
    }).catch(() => {});
  }, [createOpen, authApi, isSuperAdmin]);

  const projectsInOrg = form.orgId
    ? projects.filter(p => Number(p.org_id) === Number(form.orgId))
    : [];

  const createUser = async () => {
    if (!form.username.trim() || !form.password) {
      message.error('请填写用户名和密码');
      return;
    }
    if (!isSuperAdmin && !form.orgId) {
      message.error('请选择要挂靠的组织');
      return;
    }
    if (!isSuperAdmin && form.orgId && createUserOrgIds.length && !createUserOrgIds.includes(Number(form.orgId))) {
      message.error('无权在该组织下创建用户');
      return;
    }
    const res = await authApi.createUser({
      username: form.username.trim(),
      password: form.password,
      email: form.email || undefined,
      orgId: form.orgId === '' ? undefined : Number(form.orgId),
      projectId: form.projectId === '' ? undefined : Number(form.projectId),
    });
    message.success('用户已创建，请继续配置授权');
    setCreateOpen(false);
    setForm({ username: '', password: '', email: '', orgId: '', projectId: '' });
    const newId = res.data?.id;
    if (newId) {
      push('/auth/detail', { userId: newId });
    } else {
      load(page);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
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
          {canCreate && (
            <button type="button" className={shared.btn} onClick={() => setCreateOpen(true)}>新建用户</button>
          )}
        </div>
        <p className={shared.hint} style={{ marginBottom: 12 }}>
          仅展示你可管理组织/项目下的用户；平台超管不可见。新建用户须挂靠组织，创建后进入授权配置。
        </p>

        <div className={shared.panel}>
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>状态</th>
                  {isSuperAdmin && <th>超管</th>}
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
                    {isSuperAdmin && <td>{row.is_super_admin ? '是' : '否'}</td>}
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
          <div className={shared.formField}>
            <label htmlFor="auth-org">挂靠组织 {!isSuperAdmin && '*'}</label>
            <select
              id="auth-org"
              value={form.orgId === '' ? '' : String(form.orgId)}
              onChange={(e) => setForm({
                ...form,
                orgId: e.target.value ? Number(e.target.value) : '',
                projectId: '',
              })}
            >
              <option value="">{isSuperAdmin ? '可选组织' : '请选择组织'}</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.org_name}</option>
              ))}
            </select>
          </div>
          <div className={shared.formField}>
            <label htmlFor="auth-project">挂靠项目（可选）</label>
            <select
              id="auth-project"
              value={form.projectId === '' ? '' : String(form.projectId)}
              disabled={!form.orgId}
              onChange={(e) => setForm({
                ...form,
                projectId: e.target.value ? Number(e.target.value) : '',
              })}
            >
              <option value="">仅挂靠组织</option>
              {projectsInOrg.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
}

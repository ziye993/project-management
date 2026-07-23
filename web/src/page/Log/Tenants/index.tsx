import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { type OrgItem } from '@/api/log';
import { useLogApi } from '../../../hooks/useLogApi';
import { useAuth } from '../../../hooks/useAuth';
import shared from '../shared.module.less';

type FormState = {
  id?: number;
  org_name: string;
  contact_name: string;
  contact_phone: string;
  remark: string;
  status: number;
  bootstrapUsername: string;
  bootstrapPassword: string;
  bootstrapEmail: string;
};

const emptyForm = (): FormState => ({
  org_name: '',
  contact_name: '',
  contact_phone: '',
  remark: '',
  status: 1,
  bootstrapUsername: '',
  bootstrapPassword: '',
  bootstrapEmail: '',
});

export default function LogTenants() {
  const logApi = useLogApi();
  const { isSuperAdmin, hasCapability } = useAuth();
  const canCreateTenant = isSuperAdmin;
  const canUpdateOrg = (orgId: number) =>
    isSuperAdmin || hasCapability('log.org.update', { scopeType: 'org', scopeId: orgId });
  const [list, setList] = useState<OrgItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async (p = page) => {
    const res = await logApi.listOrgs({
      orgName: filterName || undefined,
      status: filterStatus === '' ? undefined : filterStatus,
      page: p,
      pageSize,
    });
    setList(res.data?.list || []);
    setTotal(res.data?.total || 0);
    setPage(p);
  }, [filterName, filterStatus, page, pageSize, logApi]);

  useEffect(() => {
    load(1);
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row: OrgItem) => {
    setForm({
      id: row.id,
      org_name: row.org_name,
      contact_name: row.contact_name || '',
      contact_phone: row.contact_phone || '',
      remark: row.remark || '',
      status: row.status,
      bootstrapUsername: '',
      bootstrapPassword: '',
      bootstrapEmail: '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.org_name.trim()) {
      message.error('请填写组织名称');
      return;
    }
    if (form.id) {
      await logApi.updateOrg({
        id: form.id,
        org_name: form.org_name,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        remark: form.remark,
        status: form.status,
      });
      message.success('已更新');
    } else {
      if (!form.bootstrapUsername.trim() || !form.bootstrapPassword) {
        message.error('请填写租户管理员账号和密码');
        return;
      }
      await logApi.createOrg({
        org_name: form.org_name,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        remark: form.remark,
        bootstrapUser: {
          username: form.bootstrapUsername.trim(),
          password: form.bootstrapPassword,
          email: form.bootstrapEmail || undefined,
        },
      });
      message.success('已创建');
    }
    setModalOpen(false);
    load(page);
  };

  const toggle = async (id: number) => {
    await logApi.toggleOrgStatus(id);
    message.success('状态已切换');
    load(page);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div className={shared.field}>
          <label>名称</label>
          <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="模糊搜索" />
        </div>
        <div className={shared.field}>
          <label>状态</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">全部</option>
            <option value={1}>正常</option>
            <option value={0}>禁用</option>
          </select>
        </div>
        <button type="button" className={shared.btn} onClick={() => load(1)}>查询</button>
        <button type="button" className={`${shared.btn} ${shared.btnGhost}`} onClick={openCreate} disabled={!canCreateTenant}>新建租户</button>
      </div>

      <div className={shared.panel}>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>租户名</th>
                <th>联系人</th>
                <th>电话</th>
                <th>状态</th>
                <th>项目数</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id}>
                  <td>{row.org_name}</td>
                  <td>{row.contact_name || '-'}</td>
                  <td>{row.contact_phone || '-'}</td>
                  <td className={row.status === 1 ? shared.statusOn : shared.statusOff}>
                    {row.status === 1 ? '正常' : '禁用'}
                  </td>
                  <td>{row.projectCount ?? 0}</td>
                  <td>{row.create_time}</td>
                  <td>
                    <div className={shared.actions}>
                      <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} onClick={() => openEdit(row)} disabled={!canUpdateOrg(row.id)}>编辑</button>
                      <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} onClick={() => toggle(row.id)} disabled={!canUpdateOrg(row.id)}>
                        {row.status === 1 ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <div className={shared.empty}>暂无数据</div>}
        </div>
        <div className={shared.pagination}>
          <span>共 {total} 条</span>
          <div className={shared.paginationBtns}>
            <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
            <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={page >= totalPages} onClick={() => load(page + 1)}>下一页</button>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} title={form.id ? '编辑租户' : '新建租户'} onClose={() => setModalOpen(false)} onOK={save} width="480px">
        <div className={shared.formGrid}>
          <div className={shared.formField}>
            <label>组织名称 *</label>
            <input value={form.org_name} onChange={e => setForm({ ...form, org_name: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label>联系人</label>
            <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label>联系电话</label>
            <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label>备注</label>
            <textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
          </div>
          {form.id == null && (
            <>
              <div className={shared.formField}>
                <label>管理员用户名 *</label>
                <input value={form.bootstrapUsername} onChange={e => setForm({ ...form, bootstrapUsername: e.target.value })} />
              </div>
              <div className={shared.formField}>
                <label>管理员密码 *</label>
                <input type="password" value={form.bootstrapPassword} onChange={e => setForm({ ...form, bootstrapPassword: e.target.value })} />
              </div>
              <div className={shared.formField}>
                <label>管理员邮箱</label>
                <input value={form.bootstrapEmail} onChange={e => setForm({ ...form, bootstrapEmail: e.target.value })} />
              </div>
            </>
          )}
          {form.id != null && (
            <div className={shared.formField}>
              <label>状态</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: Number(e.target.value) })}>
                <option value={1}>正常</option>
                <option value={0}>禁用</option>
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

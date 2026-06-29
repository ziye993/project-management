import { useCallback, useEffect, useState } from 'react';
import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import Modal from '../../../UiComponents/Modal';
import message from '../../../UiComponents/Modal/message';
import { useAuthApi } from '../../../hooks/useAuthApi';
import styles from './index.module.less';

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
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={() => push('/')}>
          <HomeOutlined /> 首页
        </button>
        <h1><SafetyCertificateOutlined /> 权限管理</h1>
      </header>

      <div className={styles.toolbar}>
        <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="搜索用户名" />
        <button type="button" onClick={() => load(1)}>查询</button>
        <button type="button" onClick={() => setCreateOpen(true)}>新建用户</button>
      </div>

      <div className={styles.panel}>
        <table className={styles.table}>
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
            {list.map(row => (
              <tr key={row.id}>
                <td>{row.username}</td>
                <td>{row.email || '-'}</td>
                <td>{row.status === 1 ? '正常' : '禁用'}</td>
                <td>{row.is_super_admin ? '是' : '否'}</td>
                <td>{row.create_time}</td>
                <td>
                  <button type="button" onClick={() => push('/auth/home/detail', { userId: row.id })}>授权管理</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className={styles.empty}>暂无用户</p>}
      </div>

      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => load(page + 1)}>下一页</button>
      </div>

      <Modal open={createOpen} title="新建用户" onClose={() => setCreateOpen(false)} onOK={createUser} width="420px">
        <div className={styles.form}>
          <label>用户名<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
          <label>密码<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label>邮箱<input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        </div>
      </Modal>
    </div>
  );
}

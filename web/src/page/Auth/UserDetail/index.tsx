import { useEffect, useState } from 'react';
import { useNavigate } from '../../../Router';
import ToolPageLayout from '../../../compomeents/ToolPageLayout';
import message from '../../../UiComponents/Modal/message';
import { useAuthApi } from '../../../hooks/useAuthApi';
import { useLogApi } from '../../../hooks/useLogApi';
import styles from '../Home/index.module.less';

export default function AuthUserDetail() {
  const { state } = useNavigate();
  const userId = Number(state?.userId || 0);
  const authApi = useAuthApi();
  const logApi = useLogApi();
  const [orgGrants, setOrgGrants] = useState<any[]>([]);
  const [projectGrants, setProjectGrants] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [orgGrantForm, setOrgGrantForm] = useState({ orgId: '', role: 'view' as 'manage' | 'view' });
  const [projectGrantForm, setProjectGrantForm] = useState({ projectId: '', role: 'view' as 'manage' | 'view' });
  const [resetPwd, setResetPwd] = useState('');

  const loadGrants = async () => {
    if (!userId) return;
    const res = await authApi.listGrants(userId);
    setOrgGrants(res.data?.orgGrants || []);
    setProjectGrants(res.data?.projectGrants || []);
  };

  useEffect(() => {
    if (!userId) return;
    loadGrants();
    logApi.listOrgs({ page: 1, pageSize: 500 }).then(res => setOrgs(res.data?.list || [])).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!orgGrantForm.orgId) {
      setProjects([]);
      return;
    }
    logApi.listProjects(Number(orgGrantForm.orgId)).then(res => setProjects(res.data || [])).catch(() => {});
  }, [orgGrantForm.orgId, logApi]);

  const grantOrg = async () => {
    if (!orgGrantForm.orgId) return;
    await authApi.grantOrg({ userId, orgId: Number(orgGrantForm.orgId), role: orgGrantForm.role });
    message.success('组织授权已更新');
    loadGrants();
  };

  const grantProject = async () => {
    if (!projectGrantForm.projectId) return;
    await authApi.grantProject({ userId, projectId: Number(projectGrantForm.projectId), role: projectGrantForm.role });
    message.success('项目授权已更新');
    loadGrants();
  };

  const revokeOrg = async (orgId: number) => {
    await authApi.revokeGrant({ userId, orgId });
    message.success('已撤销');
    loadGrants();
  };

  const revokeProject = async (projectId: number) => {
    await authApi.revokeGrant({ userId, projectId });
    message.success('已撤销');
    loadGrants();
  };

  const doResetPassword = async () => {
    if (!resetPwd) {
      message.error('请输入新密码');
      return;
    }
    await authApi.resetPassword({ id: userId, password: resetPwd });
    message.success('密码已重置');
    setResetPwd('');
  };

  if (!userId) {
    return (
      <ToolPageLayout homePath="/auth/home">
        <p>无效用户</p>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout homePath="/auth/home">
      <div className={styles.panel}>
        <div className={styles.section}>
          <h3>重置密码</h3>
          <div className={styles.grantRow}>
            <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="新密码" />
            <button type="button" onClick={doResetPassword}>重置</button>
          </div>
        </div>

        <div className={styles.section}>
          <h3>组织授权</h3>
          <div className={styles.grantRow}>
            <select value={orgGrantForm.orgId} onChange={e => setOrgGrantForm({ ...orgGrantForm, orgId: e.target.value })}>
              <option value="">选择组织</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
            </select>
            <select value={orgGrantForm.role} onChange={e => setOrgGrantForm({ ...orgGrantForm, role: e.target.value as 'manage' | 'view' })}>
              <option value="view">view</option>
              <option value="manage">manage</option>
            </select>
            <button type="button" onClick={grantOrg}>授权</button>
          </div>
          <ul className={styles.grantList}>
            {orgGrants.map(g => (
              <li key={g.orgId}>
                <span>{g.orgName || g.orgId} · {g.role}</span>
                <button type="button" onClick={() => revokeOrg(g.orgId)}>撤销</button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h3>项目授权</h3>
          <div className={styles.grantRow}>
            <select value={orgGrantForm.orgId} onChange={e => setOrgGrantForm({ ...orgGrantForm, orgId: e.target.value })}>
              <option value="">先选组织</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
            </select>
            <select value={projectGrantForm.projectId} onChange={e => setProjectGrantForm({ ...projectGrantForm, projectId: e.target.value })}>
              <option value="">选择项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
            <select value={projectGrantForm.role} onChange={e => setProjectGrantForm({ ...projectGrantForm, role: e.target.value as 'manage' | 'view' })}>
              <option value="view">view</option>
              <option value="manage">manage</option>
            </select>
            <button type="button" onClick={grantProject}>授权</button>
          </div>
          <ul className={styles.grantList}>
            {projectGrants.map(g => (
              <li key={g.projectId}>
                <span>{g.projectName || g.projectId} · {g.role}</span>
                <button type="button" onClick={() => revokeProject(g.projectId)}>撤销</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
}

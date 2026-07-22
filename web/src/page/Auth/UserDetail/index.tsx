import { useEffect, useState } from 'react';
import { useNavigate } from '../../../Router';
import ToolPageLayout from '@/components/ToolPageLayout';
import message from '@/components/ui/Modal/message';
import { useAuthApi } from '../../../hooks/useAuthApi';
import { useLogApi } from '../../../hooks/useLogApi';
import styles from '../Home/index.module.less';

type Role = 'manage' | 'view';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'view', label: '只读（view）' },
  { value: 'manage', label: '管理（manage）' },
];

export default function AuthUserDetail() {
  const { state } = useNavigate();
  const userId = Number(state?.userId || 0);
  const authApi = useAuthApi();
  const logApi = useLogApi();
  const [orgGrants, setOrgGrants] = useState<any[]>([]);
  const [projectGrants, setProjectGrants] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [orgGrantForm, setOrgGrantForm] = useState({ orgId: '', role: 'view' as Role });
  const [projectGrantForm, setProjectGrantForm] = useState({
    orgId: '',
    projectId: '',
    role: 'view' as Role,
  });
  const [resetPwd, setResetPwd] = useState('');
  const [orgsLoading, setOrgsLoading] = useState(false);

  const loadGrants = async () => {
    if (!userId) return;
    const res = await authApi.listGrants(userId);
    setOrgGrants(res.data?.orgGrants || []);
    setProjectGrants(res.data?.projectGrants || []);
  };

  useEffect(() => {
    if (!userId) return;
    loadGrants();
    setOrgsLoading(true);
    logApi
      .listOrgs({ page: 1, pageSize: 100 })
      .then(res => setOrgs(res.data?.list || []))
      .catch(() => setOrgs([]))
      .finally(() => setOrgsLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!projectGrantForm.orgId) {
      setProjects([]);
      return;
    }
    logApi
      .listProjects(Number(projectGrantForm.orgId))
      .then(res => setProjects(res.data || []))
      .catch(() => setProjects([]));
  }, [projectGrantForm.orgId, logApi]);

  const grantOrg = async () => {
    if (!orgGrantForm.orgId) {
      message.error('请先选择组织');
      return;
    }
    await authApi.grantOrg({
      userId,
      orgId: Number(orgGrantForm.orgId),
      role: orgGrantForm.role,
    });
    message.success('组织授权已更新');
    loadGrants();
  };

  const grantProject = async () => {
    if (!projectGrantForm.projectId) {
      message.error('请先选择项目');
      return;
    }
    await authApi.grantProject({
      userId,
      projectId: Number(projectGrantForm.projectId),
      role: projectGrantForm.role,
    });
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
        <p className={styles.hint}>
          本页只管理「日志模块」的租户/项目访问权，不是勾选首页各功能模块。
          流程：先在「日志 → 租户管理」建组织，在「租户工作台」建项目，再回到这里给用户授权。
          首页模块的显示/需登录请到「系统配置 → 模块访问控制」（全局生效，不按用户）。
        </p>

        <div className={styles.section}>
          <h3>重置密码</h3>
          <div className={styles.grantRow}>
            <input
              type="password"
              value={resetPwd}
              onChange={e => setResetPwd(e.target.value)}
              placeholder="新密码"
            />
            <button type="button" onClick={doResetPassword}>重置</button>
          </div>
        </div>

        <div className={styles.section}>
          <h3>组织授权</h3>
          <p className={styles.hintMuted}>
            授权后用户可进入对应租户；「管理」可改组织/项目/Key，「只读」仅可查看。
          </p>
          {!orgsLoading && !orgs.length && (
            <p className={styles.hintWarn}>
              暂无组织可选。请先到「日志 → 租户管理」创建租户。
            </p>
          )}
          <div className={styles.grantRow}>
            <select
              value={orgGrantForm.orgId}
              onChange={e => setOrgGrantForm({ ...orgGrantForm, orgId: e.target.value })}
            >
              <option value="">选择组织</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.org_name}</option>
              ))}
            </select>
            <select
              value={orgGrantForm.role}
              onChange={e => setOrgGrantForm({ ...orgGrantForm, role: e.target.value as Role })}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button type="button" onClick={grantOrg} disabled={!orgs.length}>授权</button>
          </div>
          <ul className={styles.grantList}>
            {orgGrants.map(g => (
              <li key={g.orgId}>
                <span>{g.orgName || g.orgId} · {g.role === 'manage' ? '管理' : '只读'}</span>
                <button type="button" onClick={() => revokeOrg(g.orgId)}>撤销</button>
              </li>
            ))}
            {!orgGrants.length && <li className={styles.emptyGrant}>尚未授予任何组织</li>}
          </ul>
        </div>

        <div className={styles.section}>
          <h3>项目授权</h3>
          <p className={styles.hintMuted}>
            先选组织筛出项目，再选项目与权限。可只授某个项目，而不授整个组织。
          </p>
          <div className={styles.grantRow}>
            <select
              value={projectGrantForm.orgId}
              onChange={e => setProjectGrantForm({
                ...projectGrantForm,
                orgId: e.target.value,
                projectId: '',
              })}
            >
              <option value="">先选组织</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.org_name}</option>
              ))}
            </select>
            <select
              value={projectGrantForm.projectId}
              onChange={e => setProjectGrantForm({
                ...projectGrantForm,
                projectId: e.target.value,
              })}
              disabled={!projectGrantForm.orgId}
            >
              <option value="">
                {!projectGrantForm.orgId
                  ? '先选组织'
                  : projects.length
                    ? '选择项目'
                    : '该组织下暂无项目'}
              </option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
            <select
              value={projectGrantForm.role}
              onChange={e => setProjectGrantForm({
                ...projectGrantForm,
                role: e.target.value as Role,
              })}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button type="button" onClick={grantProject} disabled={!projectGrantForm.projectId}>
              授权
            </button>
          </div>
          <ul className={styles.grantList}>
            {projectGrants.map(g => (
              <li key={g.projectId}>
                <span>{g.projectName || g.projectId} · {g.role === 'manage' ? '管理' : '只读'}</span>
                <button type="button" onClick={() => revokeProject(g.projectId)}>撤销</button>
              </li>
            ))}
            {!projectGrants.length && <li className={styles.emptyGrant}>尚未授予任何项目</li>}
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
}

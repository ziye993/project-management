import { useCallback, useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { copyTextToClipboard } from '@/utils/clipboard';
import {
  type OrgItem,
  type ProjectItem,
  type ApiKeyItem,
} from '@/api/log';
import { useLogApi } from '../../../hooks/useLogApi';
import { useAuth } from '../../../hooks/useAuth';
import shared from '../shared.module.less';

export default function LogWorkspace() {
  const logApi = useLogApi();
  const { isSuperAdmin, hasCapability } = useAuth();
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgId, setOrgId] = useState<number | ''>('');
  const orgIdNum = orgId === '' ? null : Number(orgId);
  const canCreateProject = isSuperAdmin || (orgIdNum != null && hasCapability('log.project.create', { scopeType: 'org', scopeId: orgIdNum }));
  const canUpdateProject = isSuperAdmin || (orgIdNum != null && hasCapability('log.project.update', { scopeType: 'org', scopeId: orgIdNum }));
  const canCreateKey = (projectId: number) =>
    isSuperAdmin || hasCapability('log.key.create', { scopeType: 'project', scopeId: projectId }, orgIdNum);
  const canToggleKey = (projectId: number) =>
    isSuperAdmin || hasCapability('log.key.toggle', { scopeType: 'project', scopeId: projectId }, orgIdNum);
  const canDeleteKey = (projectId: number) =>
    isSuperAdmin || hasCapability('log.key.delete', { scopeType: 'project', scopeId: projectId }, orgIdNum);
  const [orgDetail, setOrgDetail] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [keysMap, setKeysMap] = useState<Record<number, ApiKeyItem[]>>({});

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ project_name: '', project_code: '', description: '' });

  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyProjectId, setKeyProjectId] = useState<number | null>(null);
  const [keyForm, setKeyForm] = useState({ key_name: '', expire_time: '', remark: '' });

  const [plainKeyModal, setPlainKeyModal] = useState(false);
  const [plainKey, setPlainKey] = useState('');

  useEffect(() => {
    logApi.listOrgs({ page: 1, pageSize: 500 }).then(res => {
      const items = res.data?.list || [];
      setOrgs(items);
      if (items.length && !orgId) setOrgId(items[0].id);
    }).catch(() => {});
  }, [logApi]);

  const loadProjects = useCallback(async () => {
    if (!orgId) return;
    const [detailRes, projRes] = await Promise.all([
      logApi.getOrgDetail(orgId),
      logApi.listProjects(orgId),
    ]);
    setOrgDetail(detailRes.data);
    const projs: ProjectItem[] = projRes.data || [];
    setProjects(projs);

    const keyEntries = await Promise.all(
      projs.map(async p => {
        const res = await logApi.listKeys(p.id);
        return [p.id, res.data || []] as const;
      }),
    );
    setKeysMap(Object.fromEntries(keyEntries));
  }, [orgId, logApi]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const saveProject = async () => {
    if (!orgId) return;
    if (!projectForm.project_name.trim() || !projectForm.project_code.trim()) {
      message.error('请填写项目名称和编码');
      return;
    }
    await logApi.createProject({
      orgId,
      project_name: projectForm.project_name,
      project_code: projectForm.project_code,
      description: projectForm.description,
    });
    message.success('项目已创建');
    setProjectModalOpen(false);
    setProjectForm({ project_name: '', project_code: '', description: '' });
    loadProjects();
  };

  const openCreateKey = (projectId: number) => {
    setKeyProjectId(projectId);
    setKeyForm({ key_name: '', expire_time: '', remark: '' });
    setKeyModalOpen(true);
  };

  const saveKey = async () => {
    if (!keyProjectId) return;
    const res = await logApi.createKey({
      projectId: keyProjectId,
      key_name: keyForm.key_name || undefined,
      expire_time: keyForm.expire_time || undefined,
      remark: keyForm.remark || undefined,
    });
    setKeyModalOpen(false);
    setPlainKey(res.data?.key || '');
    setPlainKeyModal(true);
    loadProjects();
  };

  const copyKey = async () => {
    const ok = await copyTextToClipboard(plainKey);
    message[ok ? 'success' : 'error'](ok ? '已复制到剪贴板' : '复制失败，请手动复制');
  };

  const toggleProject = async (id: number) => {
    await logApi.toggleProjectStatus(id);
    message.success('项目状态已切换');
    loadProjects();
  };

  const toggleKey = async (id: number) => {
    await logApi.toggleKeyStatus(id);
    message.success('Key 状态已切换');
    loadProjects();
  };

  const removeKey = async (id: number) => {
    await logApi.deleteKey(id);
    message.success('Key 已删除');
    loadProjects();
  };

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div className={shared.field}>
          <label>当前租户</label>
          <select value={orgId} onChange={e => setOrgId(Number(e.target.value))}>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.org_name}</option>
            ))}
          </select>
        </div>
        <button type="button" className={shared.btn} disabled={!canCreateProject} onClick={() => { setProjectForm({ project_name: '', project_code: '', description: '' }); setProjectModalOpen(true); }}>
          新建项目
        </button>
      </div>

      {orgDetail && (
        <div className={shared.orgInfo}>
          <strong>{orgDetail.org_name}</strong>
          {' · '}
          联系人：{orgDetail.contact_name || '-'}
          {' · '}
          电话：{orgDetail.contact_phone || '-'}
          {' · '}
          状态：<span className={orgDetail.status === 1 ? shared.statusOn : shared.statusOff}>{orgDetail.status === 1 ? '正常' : '禁用'}</span>
          {orgDetail.remark && <><br />备注：{orgDetail.remark}</>}
        </div>
      )}

      {!projects.length && <div className={shared.empty}>该租户下暂无项目</div>}

      {projects.map(project => (
        <div key={project.id} className={`${shared.panel} ${shared.projectBlock}`}>
          <div className={shared.projectHeader} style={{ padding: '12px 16px 0' }}>
            <div>
              <span className={shared.sectionTitle}>{project.project_name}</span>
              <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>({project.project_code})</span>
              <span className={project.status === 1 ? shared.statusOn : shared.statusOff} style={{ marginLeft: 8 }}>
                {project.status === 1 ? '正常' : '禁用'}
              </span>
            </div>
            <div className={shared.actions}>
              <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={!canCreateKey(project.id)} onClick={() => openCreateKey(project.id)}>新建 Key</button>
              <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={!canUpdateProject} onClick={() => toggleProject(project.id)}>
                {project.status === 1 ? '禁用项目' : '启用项目'}
              </button>
            </div>
          </div>
          {project.description && <p className={shared.hint} style={{ padding: '0 16px' }}>{project.description}</p>}

          <div className={`${shared.tableWrap} ${shared.keySubTable}`}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>状态</th>
                  <th>过期时间</th>
                  <th>最后使用</th>
                  <th>最后 IP</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {(keysMap[project.id] || []).map(key => (
                  <tr key={key.id}>
                    <td>{key.key_name || `Key #${key.id}`}</td>
                    <td className={key.status === 1 ? shared.statusOn : shared.statusOff}>
                      {key.status === 1 ? '启用' : '禁用'}
                    </td>
                    <td>{key.expire_time || '永久'}</td>
                    <td>{key.last_used_time || '-'}</td>
                    <td>{key.last_ip || '-'}</td>
                    <td>{key.create_time}</td>
                    <td>
                      <div className={shared.actions}>
                        <button type="button" className={`${shared.btn} ${shared.btnGhost} ${shared.btnSmall}`} disabled={!canToggleKey(project.id)} onClick={() => toggleKey(key.id)}>
                          {key.status === 1 ? '禁用' : '启用'}
                        </button>
                        <button type="button" className={`${shared.btn} ${shared.btnDanger} ${shared.btnSmall}`} disabled={!canDeleteKey(project.id)} onClick={() => removeKey(key.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(keysMap[project.id] || []).length && (
              <div className={shared.empty} style={{ padding: '20px' }}>暂无 API Key</div>
            )}
          </div>
        </div>
      ))}

      <Modal open={projectModalOpen} title="新建项目" onClose={() => setProjectModalOpen(false)} onOK={saveProject} width="480px">
        <div className={shared.formGrid}>
          <div className={shared.formField}>
            <label>项目名称 *</label>
            <input value={projectForm.project_name} onChange={e => setProjectForm({ ...projectForm, project_name: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label>项目编码 *（全局唯一）</label>
            <input value={projectForm.project_code} onChange={e => setProjectForm({ ...projectForm, project_code: e.target.value })} />
          </div>
          <div className={shared.formField}>
            <label>说明</label>
            <textarea value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal open={keyModalOpen} title="新建 API Key" onClose={() => setKeyModalOpen(false)} onOK={saveKey} width="480px">
        <div className={shared.formGrid}>
          <div className={shared.formField}>
            <label>Key 名称</label>
            <input value={keyForm.key_name} onChange={e => setKeyForm({ ...keyForm, key_name: e.target.value })} placeholder="如：生产环境" />
          </div>
          <div className={shared.formField}>
            <label>过期时间（可选）</label>
            <input type="datetime-local" onChange={e => setKeyForm({ ...keyForm, expire_time: e.target.value ? e.target.value.replace('T', ' ') + ':00' : '' })} />
          </div>
          <div className={shared.formField}>
            <label>备注</label>
            <textarea value={keyForm.remark} onChange={e => setKeyForm({ ...keyForm, remark: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal open={plainKeyModal} title="API Key 已创建" onClose={() => setPlainKeyModal(false)} onOK={() => setPlainKeyModal(false)} width="560px">
        <p className={shared.hint}>明文 Key 仅显示一次，请立即复制保存。</p>
        <div className={shared.keyDisplay}>
          <span style={{ flex: 1 }}>{plainKey}</span>
          <button type="button" className={`${shared.btn} ${shared.btnSmall}`} onClick={copyKey}>
            <CopyOutlined /> 复制
          </button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../Router';
import ToolPageLayout from '@/components/ToolPageLayout';
import message from '@/components/ui/Modal/message';
import { useAuthApi } from '../../../hooks/useAuthApi';
import { useLogApi } from '../../../hooks/useLogApi';
import { useAuth } from '../../../hooks/useAuth';
import { CAPABILITIES, GROUP_LABELS } from '../../../constants/capabilities';
import type { CapabilityGrant } from '../../../context/AuthContext';
import styles from '../Home/index.module.less';

type DraftRow = {
  key: string;
  capability: string;
  scopeType: 'org' | 'project';
  scopeId: number;
  canDelegate: boolean;
  canRevokePeer: boolean;
  grantId?: number;
  grantSource?: string;
  enabled: boolean;
};

export default function AuthUserDetail() {
  const { state } = useNavigate();
  const userId = Number(state?.userId || 0);
  const authApi = useAuthApi();
  const logApi = useLogApi();
  const { grants: myGrants, isSuperAdmin, hasCapability } = useAuth();

  const [targetGrants, setTargetGrants] = useState<CapabilityGrant[]>([]);
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string; group: string; scope: string }>>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [resetPwd, setResetPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!userId) return;
    const [grantRes, catalogRes, orgRes] = await Promise.all([
      authApi.listGrantsByUser(userId),
      authApi.capabilityCatalog(),
      logApi.listOrgs({ page: 1, pageSize: 500 }),
    ]);
    setTargetGrants(grantRes.data?.grants || []);
    setCatalog(catalogRes.data?.list || []);
    setOrgs(orgRes.data?.list || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!selectedOrgId) {
      setProjects([]);
      return;
    }
    logApi.listProjects(Number(selectedOrgId)).then(res => setProjects(res.data || [])).catch(() => {});
  }, [selectedOrgId, logApi]);

  const operatorFlags = useMemo(() => {
    const map = new Map<string, { canDelegate: boolean; canRevokePeer: boolean }>();
    if (isSuperAdmin) {
      Object.keys(CAPABILITIES).forEach(id => {
        map.set(id, { canDelegate: true, canRevokePeer: true });
      });
      return map;
    }
    for (const g of myGrants) {
      if (!g.canDelegate) continue;
      const prev = map.get(g.capability);
      map.set(g.capability, {
        canDelegate: true,
        canRevokePeer: !!(prev?.canRevokePeer || g.canRevokePeer),
      });
    }
    return map;
  }, [myGrants, isSuperAdmin]);

  const buildDraftsForScope = (scopeType: 'org' | 'project', scopeId: number) => {
    const rows: DraftRow[] = [];
    const caps = catalog.length
      ? catalog
      : Object.entries(CAPABILITIES).map(([id, meta]) => ({ id, ...meta }));

    for (const cap of caps) {
      const meta = CAPABILITIES[cap.id];
      if (!meta) continue;
      if (meta.scope === 'platform') {
        if (!(scopeType === 'org' && scopeId === 0)) continue;
      } else if (meta.scope === 'org' && scopeType !== 'org') {
        continue;
      }

      const existing = targetGrants.find(g =>
        g.capability === cap.id
        && g.scopeType === scopeType
        && Number(g.scopeId) === Number(scopeId),
      );

      const flags = operatorFlags.get(cap.id);
      if (!flags && !existing) continue;

      rows.push({
        key: `${cap.id}:${scopeType}:${scopeId}`,
        capability: cap.id,
        scopeType,
        scopeId,
        canDelegate: existing ? existing.canDelegate : true,
        canRevokePeer: existing ? existing.canRevokePeer : false,
        grantId: existing?.id,
        grantSource: existing?.grantSource,
        enabled: !!existing,
      });
    }
    setDrafts(rows);
  };

  useEffect(() => {
    if (selectedOrgId === '') return;
    buildDraftsForScope('org', Number(selectedOrgId));
  }, [selectedOrgId, targetGrants, catalog, operatorFlags]);

  const grouped = useMemo(() => {
    const map: Record<string, DraftRow[]> = {};
    for (const row of drafts) {
      const group = CAPABILITIES[row.capability]?.group || 'other';
      if (!map[group]) map[group] = [];
      map[group].push(row);
    }
    return map;
  }, [drafts]);

  const updateDraft = (key: string, patch: Partial<DraftRow>) => {
    setDrafts(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (!selectedOrgId && selectedOrgId !== 0) {
      message.error('请先选择作用域');
      return;
    }
    setSaving(true);
    try {
      const scopeType = drafts[0]?.scopeType || 'org';
      const scopeId = drafts[0]?.scopeId;
      const existingInScope = targetGrants.filter(g =>
        g.scopeType === scopeType && Number(g.scopeId) === Number(scopeId),
      );

      for (const row of drafts) {
        const flags = operatorFlags.get(row.capability);
        if (row.enabled) {
          if (!flags && !isSuperAdmin) continue;
          const clampedDelegate = flags ? row.canDelegate && flags.canDelegate : row.canDelegate;
          const clampedPeer = flags ? row.canRevokePeer && flags.canRevokePeer : row.canRevokePeer;
          await authApi.grantCapability({
            userId,
            capability: row.capability,
            scopeType: row.scopeType,
            scopeId: row.scopeId,
            canDelegate: clampedDelegate,
            canRevokePeer: clampedPeer,
          });
        } else if (row.grantId) {
          await authApi.revokeCapability({ grantId: row.grantId });
        }
      }

      // 清理：目标在该 scope 有、但草稿未列出且操作者可收回的，不自动删
      void existingInScope;
      message.success('授权已保存');
      await load();
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
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

  const isTenantAdmin = targetGrants.some(g => g.grantSource === 'tenant_bootstrap');
  const canEditAuth = isSuperAdmin || hasCapability('auth.grant') || hasCapability('auth.user.update');

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
          <h3>用户 #{userId}</h3>
          {isTenantAdmin && <span className={styles.badge}>租户管理员（能力包）</span>}
          <p className={styles.hint}>业务操作权限在此配置；模块显隐请到「系统配置 → 模块访问控制」。</p>
        </div>

        {canEditAuth && (
          <div className={styles.section}>
            <h3>重置密码</h3>
            <div className={styles.grantRow}>
              <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="新密码" />
              <button type="button" onClick={doResetPassword}>重置</button>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h3>能力授权</h3>
          <div className={styles.grantRow}>
            <select
              value={selectedOrgId === 0 ? '__platform__' : selectedOrgId === '' ? '' : String(selectedOrgId)}
              onChange={e => {
                const v = e.target.value;
                if (v === '__platform__') {
                  setSelectedOrgId(0 as any);
                  buildDraftsForScope('org', 0);
                } else {
                  setSelectedOrgId(v ? Number(v) : '');
                }
              }}
            >
              <option value="">选择租户作用域</option>
              {isSuperAdmin && <option value="__platform__">平台级（应用商店写）</option>}
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.org_name}</option>
              ))}
            </select>
            <select
              disabled={!selectedOrgId || selectedOrgId === 0}
              onChange={e => {
                const pid = e.target.value;
                if (!pid) {
                  buildDraftsForScope('org', Number(selectedOrgId));
                  return;
                }
                buildDraftsForScope('project', Number(pid));
              }}
              defaultValue=""
            >
              <option value="">整租户</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
            <button type="button" disabled={saving || !drafts.length} onClick={save}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>

          {Object.entries(grouped).map(([group, rows]) => (
            <div key={group} className={styles.capGroup}>
              <h4>{GROUP_LABELS[group] || group}</h4>
              <ul className={styles.grantList}>
                {rows.map(row => {
                  const flags = operatorFlags.get(row.capability);
                  const title = CAPABILITIES[row.capability]?.title || row.capability;
                  return (
                    <li key={row.key}>
                      <label className={styles.capLabel}>
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          disabled={!flags && !row.enabled}
                          onChange={e => updateDraft(row.key, { enabled: e.target.checked })}
                        />
                        <span>{title}</span>
                        <code>{row.capability}</code>
                        {row.grantSource === 'tenant_bootstrap' && <span className={styles.badge}>bootstrap</span>}
                      </label>
                      <label className={styles.flag}>
                        <input
                          type="checkbox"
                          checked={row.canDelegate}
                          disabled={!row.enabled || !flags?.canDelegate}
                          onChange={e => updateDraft(row.key, { canDelegate: e.target.checked })}
                        />
                        允许再授权
                      </label>
                      <label className={styles.flag}>
                        <input
                          type="checkbox"
                          checked={row.canRevokePeer}
                          disabled={!row.enabled || !flags?.canRevokePeer}
                          onChange={e => updateDraft(row.key, { canRevokePeer: e.target.checked })}
                        />
                        允许收回他人同权
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {!drafts.length && selectedOrgId !== '' && (
            <p className={styles.hint}>当前作用域无可授能力（你需要先持有可再授权的能力）。</p>
          )}
        </div>

        <div className={styles.section}>
          <h3>已有授权一览</h3>
          <ul className={styles.grantList}>
            {targetGrants.map(g => (
              <li key={g.id}>
                <span>
                  {CAPABILITIES[g.capability]?.title || g.capability}
                  {' · '}
                  {g.scopeType}:{g.scopeId}
                  {g.grantSource === 'tenant_bootstrap' ? ' · 租户管理员包' : ''}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await authApi.revokeCapability({ grantId: g.id });
                    message.success('已收回');
                    load();
                  }}
                >
                  收回
                </button>
              </li>
            ))}
            {!targetGrants.length && <li>暂无授权</li>}
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
}

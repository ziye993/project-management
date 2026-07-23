import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../Router';
import message from '@/components/ui/Modal/message';
import { useAuthApi } from '../../../hooks/useAuthApi';
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

type ScopeOrg = { id: number; org_name: string };
type ScopeProject = { id: number; org_id: number; project_name: string };

export default function AuthUserDetail() {
  const { state } = useNavigate();
  const userId = Number(state?.userId || 0);
  const authApi = useAuthApi();
  const { grants: myGrants, isSuperAdmin, hasCapability } = useAuth();

  const [targetGrants, setTargetGrants] = useState<CapabilityGrant[]>([]);
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string; group: string; scope: string }>>([]);
  const [orgs, setOrgs] = useState<ScopeOrg[]>([]);
  const [allProjects, setAllProjects] = useState<ScopeProject[]>([]);
  const [canOrgLevelByOrg, setCanOrgLevelByOrg] = useState<Record<string, boolean>>({});
  const [allowPlatform, setAllowPlatform] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [resetPwd, setResetPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!userId) return;
    const [grantRes, catalogRes, scopesRes] = await Promise.all([
      authApi.listGrantsByUser(userId),
      authApi.capabilityCatalog(),
      authApi.capabilityScopes(),
    ]);
    setTargetGrants(grantRes.data?.grants || []);
    setCatalog(catalogRes.data?.list || []);
    setOrgs(scopesRes.data?.orgs || []);
    setAllProjects(scopesRes.data?.projects || []);
    setCanOrgLevelByOrg(scopesRes.data?.canOrgLevelByOrg || {});
    setAllowPlatform(!!scopesRes.data?.platform || isSuperAdmin);
  };

  useEffect(() => {
    load().catch((err) => {
      message.error(err?.message || '加载失败（可能无权查看该用户）');
    });
  }, [userId]);

  const projectsInOrg = useMemo(() => {
    if (selectedOrgId === '' || selectedOrgId === 0) return [];
    return allProjects.filter(p => Number(p.org_id) === Number(selectedOrgId));
  }, [allProjects, selectedOrgId]);

  /** 当前作用域下，操作者对某能力是否可再授权 */
  const flagsForScope = (capability: string, scopeType: 'org' | 'project', scopeId: number) => {
    if (isSuperAdmin) return { canDelegate: true, canRevokePeer: true };
    const projectOrgId = scopeType === 'project'
      ? allProjects.find(p => Number(p.id) === Number(scopeId))?.org_id
      : null;

    const matches = myGrants.filter(g => {
      if (g.capability !== capability || !g.canDelegate) return false;
      if (scopeType === 'org') {
        return g.scopeType === 'org' && Number(g.scopeId) === Number(scopeId);
      }
      // project：同项目，或覆盖该项目的 org 级
      if (g.scopeType === 'project' && Number(g.scopeId) === Number(scopeId)) return true;
      if (g.scopeType === 'org' && projectOrgId != null && Number(g.scopeId) === Number(projectOrgId)) {
        return true;
      }
      return false;
    });
    if (!matches.length) return null;
    return {
      canDelegate: true,
      canRevokePeer: matches.some(g => g.canRevokePeer),
    };
  };

  const canSelectOrgLevel = selectedOrgId !== '' && selectedOrgId !== 0 && (
    isSuperAdmin || !!canOrgLevelByOrg[String(selectedOrgId)]
  );

  const buildDraftsForScope = (scopeType: 'org' | 'project', scopeId: number) => {
    const rows: DraftRow[] = [];
    const caps = catalog.length
      ? catalog
      : Object.entries(CAPABILITIES).map(([id, meta]) => ({ id, ...meta }));

    for (const cap of caps) {
      const meta = CAPABILITIES[cap.id];
      if (!meta) continue;
      // 平台级（org+0）只展示 platform 能力；组织/项目不展示 platform 能力
      if (scopeId === 0) {
        if (meta.scope !== 'platform') continue;
      } else if (meta.scope === 'platform') {
        continue;
      } else if (meta.scope === 'org' && scopeType !== 'org') {
        continue;
      }

      const flags = flagsForScope(cap.id, scopeType, scopeId);
      const existing = targetGrants.find(g =>
        g.capability === cap.id
        && g.scopeType === scopeType
        && Number(g.scopeId) === Number(scopeId),
      );

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
    if (selectedOrgId === '') {
      setDrafts([]);
      return;
    }
    if (selectedOrgId === 0) {
      buildDraftsForScope('org', 0);
      return;
    }
    if (selectedProjectId !== '') {
      buildDraftsForScope('project', Number(selectedProjectId));
    } else if (canSelectOrgLevel) {
      buildDraftsForScope('org', Number(selectedOrgId));
    } else {
      setDrafts([]);
    }
  }, [selectedOrgId, selectedProjectId, targetGrants, catalog, myGrants, canSelectOrgLevel, allProjects]);

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
    if (selectedOrgId === '') {
      message.error('请先选择组织');
      return;
    }
    if (selectedOrgId !== 0 && !canSelectOrgLevel && selectedProjectId === '') {
      message.error('你仅有项目级权限，请选择具体项目');
      return;
    }
    setSaving(true);
    try {
      for (const row of drafts) {
        const flags = flagsForScope(row.capability, row.scopeType, row.scopeId);
        if (row.enabled) {
          if (!flags && !isSuperAdmin) continue;
          await authApi.grantCapability({
            userId,
            capability: row.capability,
            scopeType: row.scopeType,
            scopeId: row.scopeId,
            canDelegate: flags ? row.canDelegate && flags.canDelegate : row.canDelegate,
            canRevokePeer: flags ? row.canRevokePeer && flags.canRevokePeer : row.canRevokePeer,
          });
        } else if (row.grantId) {
          await authApi.revokeCapability({ grantId: row.grantId });
        }
      }
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
    return <p>无效用户</p>;
  }

  return (
    <div className={`${styles.panel} ${styles.detailPanel}`}>
      <p className={styles.hint}>
        只能在你有权的组织/项目范围内授权。先选组织，若仅有项目级权限再选项目；整租户授权需要组织级 auth.grant。
      </p>

      <div className={styles.section}>
        <h3>用户 #{userId}</h3>
        {isTenantAdmin && <span className={styles.badge}>租户管理员（能力包）</span>}
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
              setSelectedProjectId('');
              if (v === '__platform__') {
                setSelectedOrgId(0);
              } else {
                setSelectedOrgId(v ? Number(v) : '');
              }
            }}
          >
            <option value="">① 选择组织</option>
            {allowPlatform && <option value="__platform__">平台级（功能模块 / 应用商店）</option>}
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.org_name}</option>
            ))}
          </select>
          <select
            disabled={selectedOrgId === '' || selectedOrgId === 0}
            value={selectedProjectId === '' ? '' : String(selectedProjectId)}
            onChange={e => {
              setSelectedProjectId(e.target.value ? Number(e.target.value) : '');
            }}
          >
            <option value="">
              {canSelectOrgLevel ? '② 整租户（或选项目）' : '② 选择项目（必选）'}
            </option>
            {projectsInOrg.map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
          <button type="button" disabled={saving || !drafts.length} onClick={save}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>

        {selectedOrgId !== '' && selectedOrgId !== 0 && !canSelectOrgLevel && selectedProjectId === '' && (
          <p className={styles.hint}>你在该组织仅有项目级权限，请选择具体项目后再授权。</p>
        )}

        {Object.entries(grouped).map(([group, rows]) => (
          <div key={group} className={styles.capGroup}>
            <h4>{GROUP_LABELS[group] || group}</h4>
            <ul className={styles.grantList}>
              {rows.map(row => {
                const flags = flagsForScope(row.capability, row.scopeType, row.scopeId);
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
                      {row.grantSource === 'user_create' && <span className={styles.badge}>挂靠</span>}
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

        {!drafts.length && selectedOrgId !== '' && (canSelectOrgLevel || selectedProjectId !== '') && (
          <p className={styles.hint}>当前作用域无可授能力（需持有可再授权的能力）。</p>
        )}
      </div>

      <div className={styles.section}>
        <h3>可见授权一览</h3>
        <p className={styles.hint}>仅显示你可管理范围内的授权。</p>
        <ul className={styles.grantList}>
          {targetGrants.map(g => (
            <li key={g.id}>
              <span>
                {CAPABILITIES[g.capability]?.title || g.capability}
                {' · '}
                {g.scopeType}:{g.scopeId}
                {g.grantSource === 'tenant_bootstrap' ? ' · 租户管理员包' : ''}
                {g.grantSource === 'user_create' ? ' · 挂靠' : ''}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await authApi.revokeCapability({ grantId: g.id });
                    message.success('已收回');
                    load();
                  } catch (err: any) {
                    message.error(err?.message || '收回失败');
                  }
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
  );
}

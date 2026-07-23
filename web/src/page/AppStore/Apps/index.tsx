import { useCallback, useEffect, useMemo, useState } from 'react';
import ListFilterBar, { applyFilters, type FilterValue } from '@/components/ListFilterBar';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { useNavigate } from '@/Router';
import { listApps, saveApp, type AppStoreApp } from '@/api/appStore';
import type { OrgItem, ProjectItem } from '@/api/log';
import { useAuth } from '@/hooks/useAuth';
import { useLogApi } from '@/hooks/useLogApi';
import AppCard, { AppListEmpty } from '../components/AppCard';
import CoverUploader from '../components/CoverUploader';
import { useAppStoreLayout } from '../Layout';
import { SLUG_RE } from '../utils/features';
import styles from './index.module.less';

const FILTER_FIELDS = [
  { type: 'search' as const, key: 'keyword', placeholder: '搜索名称 / slug' },
];

const emptyForm = () => ({
  name: '',
  appSlug: '',
  description: '',
  coverPath: '',
  orgId: '' as number | '',
  projectId: '' as number | '',
});

export default function AppStoreAppsPage() {
  const { push } = useNavigate();
  const { createRequestId, requestCreate } = useAppStoreLayout();
  const { canWriteModule } = useAuth();
  const canWrite = canWriteModule('appStore');
  const logApi = useLogApi();
  const [apps, setApps] = useState<AppStoreApp[]>([]);
  const [filters, setFilters] = useState<FilterValue>({ keyword: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const load = useCallback(async (keyword?: string) => {
    const res = await listApps(keyword || undefined);
    setApps(res.data?.apps || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (createRequestId > 0) {
      setForm(emptyForm());
      setCreateOpen(true);
    }
  }, [createRequestId]);

  useEffect(() => {
    if (!createOpen) return;
    logApi.listOrgs({ page: 1, pageSize: 500 }).then((res) => {
      setOrgs(res.data?.list || []);
    }).catch(() => setOrgs([]));
  }, [createOpen, logApi]);

  useEffect(() => {
    if (!createOpen || !form.orgId) {
      setProjects([]);
      return;
    }
    logApi.listProjects(Number(form.orgId)).then((res) => {
      setProjects(res.data || []);
    }).catch(() => setProjects([]));
  }, [createOpen, form.orgId, logApi]);

  const keyword = String(filters.keyword || '').trim();

  useEffect(() => {
    const t = setTimeout(() => {
      void load(keyword);
    }, 200);
    return () => clearTimeout(t);
  }, [keyword, load]);

  const visibleApps = useMemo(
    () => applyFilters(apps, { keyword }, {
      keyword: (app) => `${app.name} ${app.ownerSlug} ${app.appSlug} ${app.description || ''}`,
    }),
    [apps, keyword],
  );

  const submitCreate = async () => {
    const name = form.name.trim();
    const appSlug = form.appSlug.trim().toLowerCase();
    if (!form.orgId || !form.projectId) {
      message.error('请选择所属组织与项目');
      return;
    }
    if (!name) {
      message.error('请填写应用名称');
      return;
    }
    if (!SLUG_RE.test(appSlug)) {
      message.error('appSlug 须为小写字母数字，可含中划线，最长 64');
      return;
    }
    setSaving(true);
    try {
      await saveApp({
        name,
        appSlug,
        orgId: Number(form.orgId),
        projectId: Number(form.projectId),
        description: form.description.trim(),
        coverPath: form.coverPath.trim() || undefined,
      });
      message.success('已创建');
      setCreateOpen(false);
      setForm(emptyForm());
      await load(keyword);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ListFilterBar
          fields={FILTER_FIELDS}
          value={filters}
          onChange={setFilters}
          fullWidth
        />
      </div>

      {visibleApps.length === 0 ? (
        <AppListEmpty
          keyword={keyword}
          canCreate={canWrite}
          onCreate={requestCreate}
        />
      ) : (
        <div className={styles.gridWrap}>
          <div className={styles.grid}>
            {visibleApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onClick={() => push('/app-store/app', { appId: app.id })}
              />
            ))}
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        title="新增应用"
        width="480px"
        onClose={() => !saving && setCreateOpen(false)}
        onOK={() => { if (!saving) void submitCreate(); }}
      >
        <div className={styles.form}>
          <label>
            <span>所属组织 *</span>
            <select
              value={form.orgId === '' ? '' : String(form.orgId)}
              onChange={(e) => setForm({
                ...form,
                orgId: e.target.value ? Number(e.target.value) : '',
                projectId: '',
              })}
            >
              <option value="">请选择组织</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.org_name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>所属项目 *</span>
            <select
              value={form.projectId === '' ? '' : String(form.projectId)}
              disabled={!form.orgId}
              onChange={(e) => setForm({
                ...form,
                projectId: e.target.value ? Number(e.target.value) : '',
              })}
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="应用显示名"
            />
          </label>
          <label>
            <span>appSlug *</span>
            <input
              value={form.appSlug}
              onChange={(e) => setForm({ ...form, appSlug: e.target.value.toLowerCase() })}
              placeholder="agv"
            />
          </label>
          <label>
            <span>简介</span>
            <textarea
              value={form.description}
              rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="应用简介"
            />
          </label>
          <label>
            <span>封面</span>
            <CoverUploader
              value={form.coverPath}
              onChange={(coverPath) => setForm({ ...form, coverPath })}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

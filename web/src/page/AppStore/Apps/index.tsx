import { useCallback, useEffect, useMemo, useState } from 'react';
import { shellStyles } from '@/components/ToolPageLayout';
import ListFilterBar, { applyFilters, type FilterValue } from '@/components/ListFilterBar';
import Modal from '@/components/ui/Modal';
import message from '@/components/ui/Modal/message';
import { useNavigate } from '@/Router';
import { listApps, saveApp, type AppStoreApp } from '@/api/appStore';
import AppCard from '../components/AppCard';
import CoverUploader from '../components/CoverUploader';
import { useAppStoreLayout } from '../Layout';
import { SLUG_RE } from '../utils/features';
import styles from './index.module.less';

const FILTER_FIELDS = [
  { type: 'search' as const, key: 'keyword', placeholder: '搜索名称 / slug' },
];

const emptyForm = () => ({
  name: '',
  ownerSlug: '',
  appSlug: '',
  description: '',
  coverPath: '',
});

export default function AppStoreAppsPage() {
  const { push } = useNavigate();
  const { createRequestId } = useAppStoreLayout();
  const [apps, setApps] = useState<AppStoreApp[]>([]);
  const [filters, setFilters] = useState<FilterValue>({ keyword: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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

  const keyword = String(filters.keyword || '').trim();

  // Server search on debounce-ish: reload when keyword changes (simple)
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
    const ownerSlug = form.ownerSlug.trim().toLowerCase();
    const appSlug = form.appSlug.trim().toLowerCase();
    if (!name) {
      message.error('请填写应用名称');
      return;
    }
    if (!SLUG_RE.test(ownerSlug) || !SLUG_RE.test(appSlug)) {
      message.error('ownerSlug / appSlug 须为小写字母数字，可含中划线，最长 64');
      return;
    }
    setSaving(true);
    try {
      await saveApp({
        name,
        ownerSlug,
        appSlug,
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
        <ListFilterBar fields={FILTER_FIELDS} value={filters} onChange={setFilters} />
      </div>

      <div className={`${shellStyles.contentPanel} ${styles.gridWrap}`}>
        {visibleApps.length === 0 ? (
          <p className={styles.empty}>暂无应用，点击右上角「新增」创建</p>
        ) : (
          <div className={styles.grid}>
            {visibleApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onClick={() => push('/app-store/app', { appId: app.id })}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        title="新增应用"
        width="480px"
        onClose={() => !saving && setCreateOpen(false)}
        onOK={() => { if (!saving) void submitCreate(); }}
      >
        <div className={styles.form}>
          <label>
            <span>名称</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="应用显示名"
            />
          </label>
          <label>
            <span>ownerSlug</span>
            <input
              value={form.ownerSlug}
              onChange={(e) => setForm({ ...form, ownerSlug: e.target.value.toLowerCase() })}
              placeholder="qingshan"
            />
          </label>
          <label>
            <span>appSlug</span>
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

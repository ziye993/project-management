import { useCallback, useEffect, useState } from 'react';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { shellStyles } from '@/components/ToolPageLayout';
import message from '@/components/ui/Modal/message';
import {
  deleteCalcUtilityRecord,
  getCalcUtilityRecord,
  listCalcUtilityMonths,
  saveCalcUtilityRecord,
  type CalcUtilityMonthSummary,
} from '@/api/calc';
import {
  calcElectricityBills,
  calcHouseholdPeriodKwh,
  createHousehold,
  type ElectricityBillResult,
  type HouseholdInput,
} from '../utils/electricityBill';
import {
  WATER_UNIT_PRICE,
  calcHouseholdPeriodTon,
  calcWaterBills,
  type WaterBillResult,
} from '../utils/waterBill';
import styles from './index.module.less';

function parseNum(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function currentMonthKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function emptyHouseholds(): HouseholdInput[] {
  return [createHousehold(1), createHousehold(2)];
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

export default function CalcUtilityPage() {
  const [month, setMonth] = useState(currentMonthKey);
  const [savedMonths, setSavedMonths] = useState<CalcUtilityMonthSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const [totalKwh, setTotalKwh] = useState('');
  const [totalBill, setTotalBill] = useState('');
  const [households, setHouseholds] = useState<HouseholdInput[]>(emptyHouseholds);
  const [elecResult, setElecResult] = useState<ElectricityBillResult | null>(null);
  const [waterResult, setWaterResult] = useState<WaterBillResult | null>(null);

  const refreshMonthList = useCallback(async () => {
    const res = await listCalcUtilityMonths();
    setSavedMonths(res.data?.months ?? []);
  }, []);

  const resetBlank = useCallback(() => {
    setTotalKwh('');
    setTotalBill('');
    setHouseholds(emptyHouseholds());
    setElecResult(null);
    setWaterResult(null);
    setHasSaved(false);
    setDirty(false);
  }, []);

  const loadMonth = useCallback(async (nextMonth: string) => {
    setLoading(true);
    try {
      const res = await getCalcUtilityRecord(nextMonth);
      const record = res.data?.record;
      if (!record) {
        resetBlank();
        return;
      }
      setTotalKwh(String(record.totalKwh ?? ''));
      setTotalBill(String(record.totalBill ?? ''));
      setHouseholds(
        Array.isArray(record.households) && record.households.length
          ? record.households.map(h => ({
              id: h.id,
              name: h.name || '',
              currentKwh: Number(h.currentKwh) || 0,
              prevKwh: Number(h.prevKwh) || 0,
              currentTon: Number(h.currentTon) || 0,
              prevTon: Number(h.prevTon) || 0,
            }))
          : emptyHouseholds(),
      );
      setElecResult((record.elecResult as ElectricityBillResult) || null);
      setWaterResult((record.waterResult as WaterBillResult) || null);
      setHasSaved(true);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [resetBlank]);

  useEffect(() => {
    refreshMonthList().catch(() => {});
  }, [refreshMonthList]);

  useEffect(() => {
    loadMonth(month).catch(() => {
      message.error('加载月份数据失败');
      resetBlank();
    });
  }, [month, loadMonth, resetBlank]);

  const markDirty = () => setDirty(true);

  const updateHousehold = (id: string, patch: Partial<HouseholdInput>) => {
    markDirty();
    setHouseholds(prev => prev.map(h => (h.id === id ? { ...h, ...patch } : h)));
  };

  const addHousehold = () => {
    markDirty();
    setHouseholds(prev => [...prev, createHousehold(prev.length + 1)]);
  };

  const removeHousehold = (id: string) => {
    if (households.length <= 1) {
      message.info('至少保留一户');
      return;
    }
    markDirty();
    setHouseholds(prev => prev.filter(h => h.id !== id));
  };

  const validateAndCalc = () => {
    const kwh = parseNum(totalKwh);
    const bill = parseNum(totalBill);
    if (kwh <= 0) {
      message.error('请填写有效的总表上期电量');
      return null;
    }
    if (bill < 0) {
      message.error('请填写有效的总表上期电费');
      return null;
    }
    if (!households.length) {
      message.error('请至少添加一户');
      return null;
    }
    for (const h of households) {
      const label = h.name || '未命名';
      if (h.currentKwh < 0 || h.prevKwh < 0) {
        message.error(`请检查「${label}」电表读数是否填写正确`);
        return null;
      }
      if (calcHouseholdPeriodKwh(h.currentKwh, h.prevKwh) < 0) {
        message.error(`「${label}」电表本期读数应不小于上上个月读数`);
        return null;
      }
      if (h.currentTon < 0 || h.prevTon < 0) {
        message.error(`请检查「${label}」水表读数是否填写正确`);
        return null;
      }
      if (calcHouseholdPeriodTon(h.currentTon, h.prevTon) < 0) {
        message.error(`「${label}」水表上月读数应不小于上上个月读数`);
        return null;
      }
    }
    const nextElec = calcElectricityBills(kwh, bill, households);
    const nextWater = calcWaterBills(households);
    return { kwh, bill, nextElec, nextWater };
  };

  const handleConfirm = () => {
    const computed = validateAndCalc();
    if (!computed) return;
    setElecResult(computed.nextElec);
    setWaterResult(computed.nextWater);
    markDirty();
  };

  const handleSave = async () => {
    const computed = validateAndCalc();
    if (!computed) return;
    setElecResult(computed.nextElec);
    setWaterResult(computed.nextWater);
    setSaving(true);
    try {
      await saveCalcUtilityRecord({
        month,
        totalKwh: computed.kwh,
        totalBill: computed.bill,
        households,
        elecResult: computed.nextElec,
        waterResult: computed.nextWater,
      });
      setHasSaved(true);
      setDirty(false);
      await refreshMonthList();
      message.success(`已保存 ${formatMonthLabel(month)} 数据`);
    } catch {
      /* post already toasts */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hasSaved) {
      message.info('当前月份尚未保存');
      return;
    }
    if (!window.confirm(`确定删除 ${formatMonthLabel(month)} 的数据？`)) return;
    try {
      await deleteCalcUtilityRecord(month);
      resetBlank();
      await refreshMonthList();
      message.success('已删除');
    } catch {
      /* post already toasts */
    }
  };

  return (
    <div className={styles.page}>
      <section className={`${shellStyles.panel} ${styles.section}`}>
        <h3 className={shellStyles.panelTitle}>水电费计算</h3>
        <p className={styles.hint}>
          按月保存与编辑；总表填上期电量/电费，各户电表/水表读数相减后计算（水价 {WATER_UNIT_PRICE} 元/吨）。统计功能后续再做。
        </p>

        <div className={styles.monthBar}>
          <label className={styles.field}>
            <span className={styles.label}>账单月份</span>
            <input
              className={styles.input}
              type="month"
              value={month}
              disabled={loading}
              onChange={e => {
                if (!e.target.value) return;
                if (dirty && !window.confirm('当前修改尚未保存，确认切换月份？')) return;
                setMonth(e.target.value);
              }}
            />
          </label>
          <div className={styles.monthMeta}>
            {loading ? '加载中…' : hasSaved ? (dirty ? '已修改未保存' : '已保存') : '尚未保存'}
          </div>
        </div>

        {!!savedMonths.length && (
          <div className={styles.monthChips}>
            {savedMonths.map(item => (
              <button
                key={item.month}
                type="button"
                className={`${styles.monthChip} ${item.month === month ? styles.monthChipActive : ''}`}
                onClick={() => {
                  if (item.month === month) return;
                  if (dirty && !window.confirm('当前修改尚未保存，确认切换月份？')) return;
                  setMonth(item.month);
                }}
              >
                {formatMonthLabel(item.month)}
              </button>
            ))}
          </div>
        )}

        <div className={styles.masterGrid}>
          <label className={styles.field}>
            <span className={styles.label}>上期电量（度）</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="如 494.00"
              value={totalKwh}
              onChange={e => {
                markDirty();
                setTotalKwh(e.target.value);
              }}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>上期电费（元）</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="如 209.75"
              value={totalBill}
              onChange={e => {
                markDirty();
                setTotalBill(e.target.value);
              }}
            />
          </label>
        </div>

        <div className={styles.householdHead}>
          <h4 className={styles.subTitle}>各户读数</h4>
          <button type="button" className={styles.addBtn} onClick={addHousehold}>
            <PlusOutlined /> 添加户
          </button>
        </div>

        <ul className={styles.householdList}>
          {households.map((h, index) => {
            const periodKwh = calcHouseholdPeriodKwh(h.currentKwh, h.prevKwh);
            const periodTon = calcHouseholdPeriodTon(h.currentTon, h.prevTon);
            const showElec = h.currentKwh > 0 || h.prevKwh > 0;
            const showWater = h.currentTon > 0 || h.prevTon > 0;
            return (
              <li key={h.id} className={styles.householdCard}>
                <div className={styles.householdTop}>
                  <input
                    className={`${styles.input} ${styles.nameInput}`}
                    type="text"
                    value={h.name}
                    placeholder={`第${index + 1}户`}
                    onChange={e => updateHousehold(h.id, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    title="删除此户"
                    onClick={() => removeHousehold(h.id)}
                  >
                    <DeleteOutlined />
                  </button>
                </div>

                <p className={styles.meterLabel}>电表</p>
                <div className={styles.householdGrid}>
                  <label className={styles.field}>
                    <span className={styles.label}>本期读数（度）</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={h.currentKwh || ''}
                      placeholder="0"
                      onChange={e => updateHousehold(h.id, { currentKwh: parseNum(e.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>上上个月读数（度）</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={h.prevKwh || ''}
                      placeholder="0"
                      onChange={e => updateHousehold(h.id, { prevKwh: parseNum(e.target.value) })}
                    />
                  </label>
                  <div className={styles.field}>
                    <span className={styles.label}>当月用电量（度）</span>
                    <div className={`${styles.input} ${styles.computed}`}>
                      {showElec ? periodKwh.toFixed(2) : '—'}
                    </div>
                  </div>
                </div>

                <p className={styles.meterLabel}>水表</p>
                <div className={styles.householdGrid}>
                  <label className={styles.field}>
                    <span className={styles.label}>上月读数（吨）</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={h.currentTon || ''}
                      placeholder="0"
                      onChange={e => updateHousehold(h.id, { currentTon: parseNum(e.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>上上个月读数（吨）</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={h.prevTon || ''}
                      placeholder="0"
                      onChange={e => updateHousehold(h.id, { prevTon: parseNum(e.target.value) })}
                    />
                  </label>
                  <div className={styles.field}>
                    <span className={styles.label}>当月用水量 / 水费</span>
                    <div className={`${styles.input} ${styles.computed}`}>
                      {showWater
                        ? `${periodTon.toFixed(2)} 吨 / ${(periodTon * WATER_UNIT_PRICE).toFixed(2)} 元`
                        : '—'}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={handleConfirm}>
            确认计算
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={saving || loading}
            onClick={handleSave}
          >
            <SaveOutlined /> {saving ? '保存中…' : '保存本月'}
          </button>
          {hasSaved && (
            <button type="button" className={styles.dangerBtn} onClick={handleDelete}>
              删除本月
            </button>
          )}
        </div>
      </section>

      {elecResult && (
        <section className={`${shellStyles.panel} ${styles.section}`}>
          <h3 className={shellStyles.panelTitle}>电费分摊结果</h3>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>单价</span>
              <span className={styles.summaryValue}>{elecResult.unitPrice.toFixed(4)} 元/度</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>分表合计</span>
              <span className={styles.summaryValue}>{elecResult.householdSumKwh.toFixed(2)} 度</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>与总表差额</span>
              <span className={styles.summaryValue}>{elecResult.residualKwh.toFixed(2)} 度</span>
            </div>
          </div>

          <div className={styles.resultTableWrap}>
            <table className={styles.resultTable}>
              <thead>
                <tr>
                  <th>户名</th>
                  <th>本期读数</th>
                  <th>上上个月</th>
                  <th>当月电量</th>
                  <th>占比</th>
                  <th>应缴电费（元）</th>
                </tr>
              </thead>
              <tbody>
                {elecResult.households.map(h => (
                  <tr key={h.id}>
                    <td>{h.name || '未命名'}</td>
                    <td>{h.currentKwh.toFixed(2)}</td>
                    <td>{h.prevKwh.toFixed(2)}</td>
                    <td>{h.kwh.toFixed(2)}</td>
                    <td>{h.sharePercent.toFixed(2)}%</td>
                    <td className={styles.amount}>{h.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {waterResult && (
        <section className={`${shellStyles.panel} ${styles.section}`}>
          <h3 className={shellStyles.panelTitle}>水费计算结果</h3>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>单价</span>
              <span className={styles.summaryValue}>{waterResult.unitPrice.toFixed(2)} 元/吨</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>合计用水量</span>
              <span className={styles.summaryValue}>{waterResult.totalTon.toFixed(2)} 吨</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>合计水费</span>
              <span className={styles.summaryValue}>{waterResult.totalBill.toFixed(2)} 元</span>
            </div>
          </div>

          <div className={styles.resultTableWrap}>
            <table className={styles.resultTable}>
              <thead>
                <tr>
                  <th>户名</th>
                  <th>上月读数</th>
                  <th>上上个月</th>
                  <th>当月水量（吨）</th>
                  <th>应缴水费（元）</th>
                </tr>
              </thead>
              <tbody>
                {waterResult.households.map(h => (
                  <tr key={h.id}>
                    <td>{h.name || '未命名'}</td>
                    <td>{h.currentTon.toFixed(2)}</td>
                    <td>{h.prevTon.toFixed(2)}</td>
                    <td>{h.ton.toFixed(2)}</td>
                    <td className={styles.amount}>{h.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

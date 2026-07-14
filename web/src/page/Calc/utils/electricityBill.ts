export interface HouseholdInput {
  id: string;
  name: string;
  /** 本期分表读数 */
  currentKwh: number;
  /** 上上个月分表读数 */
  prevKwh: number;
  /** 上月水表读数（吨） */
  currentTon: number;
  /** 上上个月水表读数（吨） */
  prevTon: number;
}

export interface HouseholdBillResult {
  id: string;
  name: string;
  currentKwh: number;
  prevKwh: number;
  /** 当月用电量 = 本期读数 − 上上个月读数 */
  kwh: number;
  amount: number;
  sharePercent: number;
}

export interface ElectricityBillResult {
  totalKwh: number;
  totalBill: number;
  householdSumKwh: number;
  residualKwh: number;
  unitPrice: number;
  households: HouseholdBillResult[];
}

/** 户当月用电量 = 本期读数 − 上上个月读数 */
export function calcHouseholdPeriodKwh(currentKwh: number, prevKwh: number): number {
  return roundMoney(currentKwh - prevKwh);
}

/** 按分表当月电量占总表电量比例分摊电费 */
export function calcElectricityBills(
  totalKwh: number,
  totalBill: number,
  households: HouseholdInput[],
): ElectricityBillResult {
  const unitPrice = totalKwh > 0 ? totalBill / totalKwh : 0;
  const resolved = households.map(h => ({
    ...h,
    kwh: calcHouseholdPeriodKwh(h.currentKwh || 0, h.prevKwh || 0),
  }));
  const householdSumKwh = resolved.reduce((sum, h) => sum + h.kwh, 0);

  const results: HouseholdBillResult[] = resolved.map(h => {
    const amount = totalKwh > 0 ? (h.kwh / totalKwh) * totalBill : 0;
    const sharePercent = totalKwh > 0 ? (h.kwh / totalKwh) * 100 : 0;
    return {
      id: h.id,
      name: h.name,
      currentKwh: h.currentKwh || 0,
      prevKwh: h.prevKwh || 0,
      kwh: h.kwh,
      amount: roundMoney(amount),
      sharePercent: roundMoney(sharePercent),
    };
  });

  return {
    totalKwh,
    totalBill,
    householdSumKwh: roundMoney(householdSumKwh),
    residualKwh: roundMoney(totalKwh - householdSumKwh),
    unitPrice: roundMoney(unitPrice),
    households: results,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

let householdSeq = 0;

export function createHousehold(index: number): HouseholdInput {
  householdSeq += 1;
  return {
    id: `h-${Date.now()}-${householdSeq}`,
    name: `第${index}户`,
    currentKwh: 0,
    prevKwh: 0,
    currentTon: 0,
    prevTon: 0,
  };
}

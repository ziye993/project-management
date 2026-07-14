export const WATER_UNIT_PRICE = 2.9;

export interface WaterHouseholdInput {
  id: string;
  name: string;
  /** 上月水表读数（吨） */
  currentTon: number;
  /** 上上个月水表读数（吨） */
  prevTon: number;
}

export interface WaterHouseholdResult {
  id: string;
  name: string;
  currentTon: number;
  prevTon: number;
  /** 当月用水量 = 上月读数 − 上上个月读数 */
  ton: number;
  amount: number;
}

export interface WaterBillResult {
  unitPrice: number;
  totalTon: number;
  totalBill: number;
  households: WaterHouseholdResult[];
}

/** 户当月用水量 = 上月读数 − 上上个月读数 */
export function calcHouseholdPeriodTon(currentTon: number, prevTon: number): number {
  return roundMoney(currentTon - prevTon);
}

/** 固定单价 × 当月用水量 */
export function calcWaterBills(households: WaterHouseholdInput[]): WaterBillResult {
  const results: WaterHouseholdResult[] = households.map(h => {
    const ton = calcHouseholdPeriodTon(h.currentTon || 0, h.prevTon || 0);
    return {
      id: h.id,
      name: h.name,
      currentTon: h.currentTon || 0,
      prevTon: h.prevTon || 0,
      ton,
      amount: roundMoney(ton * WATER_UNIT_PRICE),
    };
  });

  const totalTon = results.reduce((sum, h) => sum + h.ton, 0);
  const totalBill = results.reduce((sum, h) => sum + h.amount, 0);

  return {
    unitPrice: WATER_UNIT_PRICE,
    totalTon: roundMoney(totalTon),
    totalBill: roundMoney(totalBill),
    households: results,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

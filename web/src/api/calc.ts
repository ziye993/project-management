import { post } from '.';

export interface CalcUtilityHousehold {
  id: string;
  name: string;
  currentKwh: number;
  prevKwh: number;
  currentTon: number;
  prevTon: number;
}

export interface CalcUtilityRecord {
  month: string;
  totalKwh: number;
  totalBill: number;
  households: CalcUtilityHousehold[];
  elecResult: unknown;
  waterResult: unknown;
  updatedAt: number;
}

export interface CalcUtilityMonthSummary {
  month: string;
  updatedAt: number;
  householdCount: number;
  totalBill: number;
  waterTotalBill: number | null;
  elecTotalBill: number;
}

export const listCalcUtilityMonths = () =>
  post('/calc/utility/list') as Promise<{ data: { months: CalcUtilityMonthSummary[] } }>;

export const getCalcUtilityRecord = (month: string) =>
  post('/calc/utility/get', { month }) as Promise<{ data: { record: CalcUtilityRecord | null } }>;

export const saveCalcUtilityRecord = (payload: {
  month: string;
  totalKwh: number;
  totalBill: number;
  households: CalcUtilityHousehold[];
  elecResult: unknown;
  waterResult: unknown;
}) => post('/calc/utility/save', payload) as Promise<{ data: { record: CalcUtilityRecord } }>;

export const deleteCalcUtilityRecord = (month: string) =>
  post('/calc/utility/delete', { month });

export interface SalesRecord {
  id: string; // Generated ID
  plu: string; // XF_PLU
  qty: number; // XF_QTY
  amount: number; // XF_AMT
  salesman: string; // XF_SALESMAN1
  address: string; // XF_CUSTOMERADDR4
  date: string; // XF_DELIVERYDATE
  remark: string; // XF_SALESITEMREMARK
  district: string; // Extracted district (or from column)
  subDistrict?: string; // From column
  vipCode?: string; // XF_VIPCODE
  lat?: number; // Estimated Latitude
  lng?: number; // Estimated Longitude
}

export interface DistrictStat {
  district: string;
  totalSales: number;
  transactionCount: number;
  uniqueCustomers: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingLinks?: GroundingLink[];
  isThinking?: boolean;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export enum AnalysisTab {
  DASHBOARD = 'DASHBOARD',
  DATA = 'DATA',
  AI_INSIGHTS = 'AI_INSIGHTS',
  MAP = 'MAP'
}
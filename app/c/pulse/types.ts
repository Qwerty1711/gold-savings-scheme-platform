export type CustomerMetrics = {
  totalCollections: number;
  goldAllocated: number;
  silverAllocated: number;
  duesOutstanding: number;
  overdueCount: number;
  activeEnrollments: number;
  currentRates: {
    k18: { rate: number; validFrom: string } | null;
    k22: { rate: number; validFrom: string } | null;
    k24: { rate: number; validFrom: string } | null;
    silver: { rate: number; validFrom: string } | null;
  };
};

export type Transaction = {
  id: string;
  amount_paid: number;
  grams_allocated_snapshot: number;
  paid_at: string;
  txn_type: string;
  enrollment_id: string;
  scheme_name?: string;
};

export type PortfolioPoint = {
  date: string;
  contributions: number;
  value: number;
};

export type AvgPricePoint = {
  date: string;
  avgBuyGold?: number;
  marketGold?: number;
  avgBuySilver?: number;
  marketSilver?: number;
};

export type EfficiencyPoint = {
  month: string;
  efficiency: number;
};
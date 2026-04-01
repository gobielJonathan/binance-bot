export interface Trade {
  id: number
  triangle_name: string
  leg1_pair: string
  leg1_side: string
  leg1_amount: number
  leg1_price: number
  leg1_filled: number
  leg2_pair: string
  leg2_side: string
  leg2_amount: number
  leg2_price: number
  leg2_filled: number
  leg3_pair: string
  leg3_side: string
  leg3_amount: number
  leg3_price: number
  leg3_filled: number
  expected_profit_percent: number
  actual_profit_percent?: number
  actual_profit_usdt?: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial'
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface PaginatedTradeResponse {
  trades: Trade[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TradeStats {
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  winRate: number
  totalProfit: number
  avgProfit: number
  bestTrade?: {
    id: number
    triangle: string
    profit: number
    date: string
  }
  worstTrade?: {
    id: number
    triangle: string
    profit: number
    date: string
  }
}

export interface PerformanceData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    type: string
  }>
  stats: {
    totalProfit: number
    totalTrades: number
    avgProfitPerPeriod: number
  }
}

export interface Opportunity {
  id: number
  triangle_name: string
  spread_percent: number
  leg1_pair: string
  leg1_price: number
  leg2_pair: string
  leg2_price: number
  leg3_pair: string
  leg3_price: number
  executed: boolean
  created_at: string
}

export interface BotStatus {
  mode: string
  isRunning: boolean
  minSpread: number
  maxPosition: number
  timestamp: string
}

export interface ProfitSummary {
  total: {
    profit: number
    trades: number
  }
  today: {
    profit: number
    trades: number
  }
  week: {
    profit: number
    trades: number
  }
  month: {
    profit: number
    trades: number
  }
}

export interface TickerPrice {
  symbol: string
  bid: number
  ask: number
  bidQty: number
  askQty: number
  timestamp: number
}

export interface AssetBalance {
  asset: string
  free: number
  locked: number
  total: number
}

export interface BalanceInfo {
  totalUSDT: number
  freeUSDT: number
  assets: AssetBalance[]
  lastUpdate: string
}
import axios from 'axios'
import type { 
  Trade, 
  TradeStats, 
  PaginatedTradeResponse,
  PerformanceData,
  Opportunity 
} from '../types/api'

const API_BASE = import.meta.env.PROD? 'http://27.111.32.158/api': 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

export const tradingApi = {
  // Bot status
  async getStatus() {
    const response = await api.get('/status')
    return response.data
  },

  // Trades
  async getOpenTrades(): Promise<Trade[]> {
    const response = await api.get('/trades/open')
    return response.data
  },

  async getTradeHistory(params: {
    page?: number
    limit?: number
    status?: string
    triangle?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<PaginatedTradeResponse> {
    const response = await api.get('/trades/history', { params })
    return response.data
  },

  async getTradeStats(): Promise<TradeStats> {
    const response = await api.get('/trades/stats')
    return response.data
  },

  // Performance
  async getDailyPerformance(days: number = 30): Promise<PerformanceData> {
    const response = await api.get('/performance/daily', { params: { days } })
    return response.data
  },

  async getWeeklyPerformance(weeks: number = 12): Promise<PerformanceData> {
    const response = await api.get('/performance/weekly', { params: { weeks } })
    return response.data
  },

  async getMonthlyPerformance(months: number = 12): Promise<PerformanceData> {
    const response = await api.get('/performance/monthly', { params: { months } })
    return response.data
  },

  // Opportunities
  async getRecentOpportunities(limit: number = 100): Promise<Opportunity[]> {
    const response = await api.get('/opportunities/recent', { params: { limit } })
    return response.data
  },

  // Profit summary
  async getProfitSummary() {
    const response = await api.get('/profit')
    return response.data
  },

  // Balance
  async getBalance() {
    const response = await api.get('/balance')
    return response.data
  },

  // Metrics
  async getMetrics(period: string = 'daily') {
    const response = await api.get('/metrics', { params: { period } })
    return response.data
  }
}

export default api

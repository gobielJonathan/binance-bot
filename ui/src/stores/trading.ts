import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { tradingApi } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import type { 
  Trade, 
  TradeStats, 
  PerformanceData, 
  Opportunity,
  BotStatus,
  ProfitSummary,
  TickerPrice,
  BalanceInfo,
} from '../types/api'

export const useTradingStore = defineStore('trading', () => {
  // State
  const botStatus = ref<BotStatus | null>(null)
  const openTrades = ref<Trade[]>([])
  const tradeHistory = ref<Trade[]>([])
  const tradeStats = ref<TradeStats | null>(null)
  const opportunities = ref<Opportunity[]>([])
  const profitSummary = ref<ProfitSummary | null>(null)
  
  // Performance data
  const dailyPerformance = ref<PerformanceData | null>(null)
  const weeklyPerformance = ref<PerformanceData | null>(null)
  const monthlyPerformance = ref<PerformanceData | null>(null)
  
  // Loading states
  const loading = ref({
    status: false,
    openTrades: false,
    tradeHistory: false,
    stats: false,
    performance: false,
    opportunities: false,
    profit: false
  })
  
  // Error states
  const errors = ref({
    status: null as string | null,
    openTrades: null as string | null,
    tradeHistory: null as string | null,
    stats: null as string | null,
    performance: null as string | null,
    opportunities: null as string | null,
    profit: null as string | null
  })

  // Socket state
  const socketConnected = ref(false)

  // Live bid/ask ticker map: symbol → TickerPrice
  const tickers = ref<Map<string, TickerPrice>>(new Map())

  // Account balance
  const balance = ref<BalanceInfo | null>(null)
  const loadingBalance = ref(false)

  // Computed
  const totalProfit = computed(() => profitSummary.value?.total.profit || 0)
  const totalTrades = computed(() => profitSummary.value?.total.trades || 0)
  const isRunning = computed(() => botStatus.value?.isRunning || false)
  const currentMode = computed(() => botStatus.value?.mode || 'unknown')

  // Actions
  async function fetchBotStatus() {
    loading.value.status = true
    errors.value.status = null
    try {
      botStatus.value = await tradingApi.getStatus()
    } catch (error) {
      errors.value.status = error instanceof Error ? error.message : 'Failed to fetch status'
      console.error('Error fetching bot status:', error)
    } finally {
      loading.value.status = false
    }
  }

  async function fetchOpenTrades() {
    loading.value.openTrades = true
    errors.value.openTrades = null
    try {
      openTrades.value = await tradingApi.getOpenTrades()
    } catch (error) {
      errors.value.openTrades = error instanceof Error ? error.message : 'Failed to fetch trades'
      console.error('Error fetching open trades:', error)
    } finally {
      loading.value.openTrades = false
    }
  }

  async function fetchTradeHistory(params: {
    page?: number
    limit?: number
    status?: string
    triangle?: string
    startDate?: string
    endDate?: string
  } = {}) {
    loading.value.tradeHistory = true
    errors.value.tradeHistory = null
    try {
      const response = await tradingApi.getTradeHistory(params)
      tradeHistory.value = response.trades
      return response
    } catch (error) {
      errors.value.tradeHistory = error instanceof Error ? error.message : 'Failed to fetch trade history'
      console.error('Error fetching trade history:', error)
      return null
    } finally {
      loading.value.tradeHistory = false
    }
  }

  async function fetchTradeStats() {
    loading.value.stats = true
    errors.value.stats = null
    try {
      tradeStats.value = await tradingApi.getTradeStats()
    } catch (error) {
      errors.value.stats = error instanceof Error ? error.message : 'Failed to fetch stats'
      console.error('Error fetching trade stats:', error)
    } finally {
      loading.value.stats = false
    }
  }

  async function fetchPerformanceData() {
    loading.value.performance = true
    errors.value.performance = null
    try {
      const [daily, weekly, monthly] = await Promise.all([
        tradingApi.getDailyPerformance(30),
        tradingApi.getWeeklyPerformance(12),
        tradingApi.getMonthlyPerformance(12)
      ])
      
      dailyPerformance.value = daily
      weeklyPerformance.value = weekly
      monthlyPerformance.value = monthly
    } catch (error) {
      errors.value.performance = error instanceof Error ? error.message : 'Failed to fetch performance'
      console.error('Error fetching performance data:', error)
    } finally {
      loading.value.performance = false
    }
  }

  async function fetchOpportunities() {
    loading.value.opportunities = true
    errors.value.opportunities = null
    try {
      opportunities.value = await tradingApi.getRecentOpportunities(100)
    } catch (error) {
      errors.value.opportunities = error instanceof Error ? error.message : 'Failed to fetch opportunities'
      console.error('Error fetching opportunities:', error)
    } finally {
      loading.value.opportunities = false
    }
  }

  async function fetchProfitSummary() {
    loading.value.profit = true
    errors.value.profit = null
    try {
      profitSummary.value = await tradingApi.getProfitSummary()
    } catch (error) {
      errors.value.profit = error instanceof Error ? error.message : 'Failed to fetch profit summary'
      console.error('Error fetching profit summary:', error)
    } finally {
      loading.value.profit = false
    }
  }

  async function fetchBalance() {
    loadingBalance.value = true
    try {
      balance.value = await tradingApi.getBalance()
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      loadingBalance.value = false
    }
  }

  async function refreshAll() {
    await Promise.all([
      fetchBotStatus(),
      fetchOpenTrades(),
      fetchTradeStats(),
      fetchPerformanceData(),
      fetchOpportunities(),
      fetchProfitSummary(),
      fetchBalance(),
    ])
  }

  function initSocket() {
    const socket = connectSocket()

    socket.on('connect', () => {
      socketConnected.value = true
    })

    socket.on('disconnect', () => {
      socketConnected.value = false
    })

    // Real-time bot status
    socket.on('bot:status', (data: BotStatus) => {
      botStatus.value = data
    })

    // New trade opened
    socket.on('trade:new', (trade: Trade) => {
      const exists = openTrades.value.some((t) => t.id === trade.id)
      if (!exists) openTrades.value.unshift(trade)
    })

    // Trade state updated (e.g. leg filled, completed, failed)
    socket.on('trade:update', (trade: Trade) => {
      const idx = openTrades.value.findIndex((t) => t.id === trade.id)
      if (idx !== -1) {
        if (trade.status === 'completed' || trade.status === 'failed' || trade.status === 'partial') {
          openTrades.value.splice(idx, 1)
        } else {
          openTrades.value[idx] = trade
        }
      }
      // Refresh stats & profit after any trade change
      fetchTradeStats()
      fetchProfitSummary()
    })

    // New opportunity scanned
    socket.on('opportunity:detected', (opp: Opportunity) => {
      opportunities.value.unshift(opp)
      if (opportunities.value.length > 100) {
        opportunities.value = opportunities.value.slice(0, 100)
      }
    })

    // Profit summary pushed from server
    socket.on('profit:update', (data: ProfitSummary) => {
      profitSummary.value = data
    })

    // Live ticker bid/ask updates
    socket.on('ticker:update', (data: TickerPrice) => {
      tickers.value.set(data.symbol, data)
      // Trigger Vue reactivity on the Map
      tickers.value = new Map(tickers.value)
    })
  }

  function destroySocket() {
    disconnectSocket()
    socketConnected.value = false
  }

  return {
    // State
    botStatus,
    openTrades,
    tradeHistory,
    tradeStats,
    opportunities,
    profitSummary,
    balance,
    loadingBalance,
    dailyPerformance,
    weeklyPerformance,
    monthlyPerformance,
    loading,
    errors,
    socketConnected,
    tickers,
    
    // Computed
    totalProfit,
    totalTrades,
    isRunning,
    currentMode,
    
    // Actions
    fetchBotStatus,
    fetchOpenTrades,
    fetchTradeHistory,
    fetchTradeStats,
    fetchPerformanceData,
    fetchOpportunities,
    fetchProfitSummary,
    fetchBalance,
    refreshAll,
    initSocket,
    destroySocket,
  }
})
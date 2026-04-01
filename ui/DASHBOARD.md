# Trading Bot Dashboard

A comprehensive Vue.js dashboard for monitoring and managing the Binance arbitrage trading bot.

## 🚀 Features

### 📊 **Performance Analytics**
- **Multi-timeframe Charts**: Daily, weekly, and monthly performance visualization
- **Profit Tracking**: Real-time profit/loss tracking with cumulative and period views
- **Interactive Charts**: Built with Chart.js for responsive, interactive data visualization

### 📈 **Trading Metrics**
- **Live Statistics**: Total profit, trade count, win rate, average profit
- **Trade Status**: Open trades monitoring with real-time updates
- **Historical Analysis**: Comprehensive trade history with filtering and pagination

### 🎯 **Opportunity Monitoring**
- **Real-time Opportunities**: Live arbitrage opportunities detection
- **Execution Tracking**: Monitor which opportunities were executed vs missed
- **Spread Analysis**: Visual spread percentages and profitability indicators

### 🔧 **Bot Management**
- **Status Monitoring**: Real-time bot status (Running/Stopped, Testnet/Live)
- **Auto-refresh**: Automatic data updates every 30 seconds
- **Error Handling**: Comprehensive error states and retry mechanisms

## 🏗️ **Architecture**

### **Frontend Stack**
- **Vue 3**: Modern reactive framework with Composition API
- **TypeScript**: Full type safety and enhanced developer experience
- **Pinia**: State management for centralized data handling
- **Vue Router**: Client-side routing for SPA navigation
- **Chart.js + Vue-Chart.js**: Interactive data visualization
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Heroicons**: Beautiful SVG icons
- **Date-fns**: Modern date manipulation library
- **Axios**: HTTP client for API communication

### **Component Structure**
```
src/
├── components/              # Reusable UI components
│   ├── StatusBadge.vue     # Bot status indicator
│   ├── TradeStatusBadge.vue # Trade status badges
│   ├── StatsOverview.vue   # Statistics cards grid
│   ├── PerformanceCharts.vue # Multi-timeframe charts
│   ├── OpenTrades.vue      # Active trades list
│   ├── OpportunitiesList.vue # Recent opportunities
│   └── TradeHistory.vue    # Historical trade table
├── views/                  # Page components
│   └── Dashboard.vue       # Main dashboard layout
├── services/               # API and business logic
│   └── api.ts             # REST API client
├── stores/                # Pinia state management
│   └── trading.ts         # Trading data store
└── types/                 # TypeScript definitions
    └── api.ts             # API response types
```

### **API Integration**
All dashboard components connect to the backend REST API endpoints:

- `GET /api/status` - Bot status and configuration
- `GET /api/trades/open` - Currently executing trades
- `GET /api/trades/history` - Historical trade data with filtering
- `GET /api/trades/stats` - Trading performance statistics
- `GET /api/performance/daily` - Daily performance charts
- `GET /api/performance/weekly` - Weekly performance charts  
- `GET /api/performance/monthly` - Monthly performance charts
- `GET /api/opportunities/recent` - Recent arbitrage opportunities
- `GET /api/profit` - Profit summaries

## 🎨 **UI/UX Features**

### **Responsive Design**
- **Mobile-first**: Optimized for all screen sizes
- **Grid Layouts**: Adaptive grid system using Tailwind CSS
- **Interactive Elements**: Hover states, loading indicators, error states

### **Data Visualization**
- **Dual-axis Charts**: Cumulative profit (line) + period profit (bars)
- **Color Coding**: Green/red for profits/losses across all components
- **Time-based Filtering**: Switch between daily, weekly, monthly views
- **Real-time Updates**: Live data refreshing with loading states

### **User Experience**
- **Loading States**: Smooth loading animations for all async operations
- **Error Handling**: Graceful error messages with retry options
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Performance**: Optimized re-rendering and data fetching

## 📱 **Dashboard Sections**

### **1. Header**
- Bot status indicator (Running/Stopped, Testnet/Live)
- Manual refresh button with loading state
- Real-time status updates

### **2. Statistics Overview**
- **Total Profit**: Lifetime trading profits with color coding
- **Total Trades**: Complete trade execution count  
- **Win Rate**: Percentage of profitable trades
- **Open Trades**: Currently active trade count
- **Today's Performance**: Daily profit and trade count
- **Average Performance**: Average profit per trade and profitable trade count

### **3. Performance Charts**
- **Interactive Timeline**: Switch between daily, weekly, monthly views
- **Dual Chart**: Cumulative profit trend line + period profit bars
- **Summary Stats**: Total profit, trades, and average profit per period
- **Chart.js Integration**: Responsive, interactive, and customizable

### **4. Live Trading Data**
- **Open Trades Panel**: Real-time active trades with progress indicators
- **Opportunities Panel**: Recent arbitrage opportunities with execution status
- **Trade Progress**: Visual progress bars showing trade leg completion

### **5. Trade History Table**
- **Comprehensive Data**: All historical trades with full details
- **Advanced Filtering**: Filter by status, triangle, date range
- **Pagination**: Efficient data loading for large datasets
- **Sortable Columns**: Sort by date, profit, status, etc.

## 🔧 **Development**

### **Prerequisites**
- Node.js 20.19.0+ or 22.12.0+
- npm or pnpm package manager

### **Setup**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### **Environment Configuration**
The dashboard connects to the backend API running on `http://localhost:3000/api`.
Update `src/services/api.ts` to change the API base URL.

### **State Management**
The Pinia store (`src/stores/trading.ts`) centralizes all trading data:
- Reactive state for all dashboard data
- Computed properties for derived values
- Actions for API calls with error handling
- Loading and error state management

## 🚀 **Production Deployment**

### **Build Process**
```bash
npm run build
```
Generates optimized static files in `dist/` directory.

### **Backend Integration**
The dashboard is designed to be served by the trading bot's Express server:
- Static files served from `ui/dist/`
- API endpoints under `/api/*`
- Client-side routing with fallback to `index.html`

### **Performance Considerations**
- **Lazy Loading**: Components loaded on demand
- **Data Caching**: Efficient API response caching
- **Bundle Optimization**: Tree-shaking and code splitting
- **Image Optimization**: Optimized assets and icons

## 📊 **Data Flow**

```
[Trading Bot] ← API → [Backend Repository Layer] ← HTTP → [Vue Dashboard]
     ↓                        ↓                           ↓
[SQLite Database] → [Performance Data] → [Real-time Charts]
```

### **Real-time Updates**
- **Polling**: 30-second automatic refresh intervals
- **Manual Refresh**: User-triggered data updates  
- **Error Recovery**: Automatic retry on API failures
- **State Persistence**: Maintains UI state across refreshes

## 🎯 **Key Metrics Tracked**

### **Performance Metrics**
- Total profit (USDT)
- Trade count and win rate
- Average profit per trade
- Best/worst trade performance
- Daily/weekly/monthly trends

### **Trading Activity** 
- Open trade monitoring
- Trade execution progress
- Historical trade analysis
- Arbitrage opportunity tracking

### **Bot Health**
- Connection status
- Error tracking
- Performance monitoring
- Configuration display

---

This dashboard provides a comprehensive, professional interface for monitoring and analyzing the trading bot's performance in real-time. Built with modern web technologies and following best practices for scalability, maintainability, and user experience.
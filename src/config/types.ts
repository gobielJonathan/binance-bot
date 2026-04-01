export interface Triangle {
  pairs: [string, string, string];
  name: string;
}

export interface Config {
  // Exchange Configuration
  exchange: {
    name: string;
    testnet: boolean;
    apiKey: string;
    apiSecret: string;
  };

  // Strategy Parameters
  strategy: {
    minSpreadPercent: number;
    minLiquidity24h: number;
    maxPositionPercent: number;
    triangles: Triangle[];
  };

  // Risk Management
  risk: {
    maxConcurrentTrades: number;
    stopLossPercent: number;
    consecutiveLossLimit: number;
  };

  // Execution Settings
  execution: {
    orderTimeoutMs: number;
    priceRefreshMs: number;
  };

  // Dashboard
  dashboard: {
    port: number;
  };

  // Logging
  logging: {
    level: string;
  };
}

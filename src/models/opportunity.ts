export interface ArbitrageOpportunity {
  triangleName: string;
  spreadPercent: number;
  netProfitPercent: number;
  estimatedProfitUSDT: number;
  leg1: {
    pair: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
  };
  leg2: {
    pair: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
  };
  leg3: {
    pair: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
  };
  timestamp: number;
}

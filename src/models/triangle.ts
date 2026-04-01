export interface TrianglePath {
  name: string;
  pairs: [string, string, string];
  legs: [TradeLeg, TradeLeg, TradeLeg];
}

export interface TradeLeg {
  pair: string;
  side: 'BUY' | 'SELL';
  baseAsset: string;
  quoteAsset: string;
}

export interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  timestamp: number;
}

export interface TickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  bidQty: string;
  askQty: string;
  volume: string;
  quoteVolume: string;
}

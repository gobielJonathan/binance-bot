import BinanceService, { Balance } from '../binance';
import logger from '../../utils/logger';

export interface AssetBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

class BalanceManager {
  private binanceService: BinanceService;
  private balances: Map<string, AssetBalance> = new Map();
  private lastUpdate: number = 0;
  private updateIntervalMs: number = 10000;

  constructor(binanceService: BinanceService) {
    this.binanceService = binanceService;
    logger.info('Balance manager initialized');
  }

  async updateBalances(): Promise<void> {
    try {
      const balances = await this.binanceService.getAllBalances();

      this.balances.clear();
      for (const balance of balances) {
        const assetBalance: AssetBalance = {
          asset: balance.asset,
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: parseFloat(balance.free) + parseFloat(balance.locked),
        };
        this.balances.set(balance.asset, assetBalance);
      }

      this.lastUpdate = Date.now();
      logger.debug('Balances updated', { count: this.balances.size });
    } catch (error) {
      logger.error('Failed to update balances', { error });
      throw error;
    }
  }

  async getBalance(asset: string, forceUpdate: boolean = false): Promise<AssetBalance | null> {
    if (forceUpdate || this.shouldUpdate()) {
      await this.updateBalances();
    }

    return this.balances.get(asset) || null;
  }

  async getAllBalances(forceUpdate: boolean = false): Promise<Map<string, AssetBalance>> {
    if (forceUpdate || this.shouldUpdate()) {
      await this.updateBalances();
    }

    return new Map(this.balances);
  }

  async hasMinimumBalance(asset: string, minAmount: number): Promise<boolean> {
    const balance = await this.getBalance(asset);
    if (!balance) {
      return false;
    }

    return balance.free >= minAmount;
  }

  async getAvailableAmount(asset: string): Promise<number> {
    const balance = await this.getBalance(asset);
    return balance?.free || 0;
  }

  async getTotalValue(assets: string[]): Promise<number> {
    let total = 0;

    for (const asset of assets) {
      const balance = await this.getBalance(asset);
      if (balance) {
        total += balance.total;
      }
    }

    return total;
  }

  private shouldUpdate(): boolean {
    return Date.now() - this.lastUpdate > this.updateIntervalMs;
  }

  getLastUpdateAge(): number {
    return Date.now() - this.lastUpdate;
  }

  async getUSDTBalance(): Promise<number> {
    const balance = await this.getBalance('USDT');
    return balance?.free || 0;
  }

  async getTotalBalanceUSDT(): Promise<number> {
    const balance = await this.getBalance('USDT');
    return balance?.total || 0;
  }
}

export default BalanceManager;

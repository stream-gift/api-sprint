import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
type Crypto = 'SOL' | 'SUI' | 'BTC' | 'ETH' | 'USDC';
type Pair = 'USDT';

const CACHE_DURATION_MINS = 5;
const CACHE_DURATION_MS = CACHE_DURATION_MINS * 60 * 1000;

@Injectable()
export class PriceService {
  constructor(private readonly httpService: HttpService) {}

  private prices: Partial<
    Record<`${Crypto}${Pair}`, { price: number; timestamp: number }>
  > = {};

  async getPrice(crypto: Crypto, pair: Pair = 'USDT'): Promise<number> {
    const now = Date.now();
    const cached = this.prices[`${crypto}${pair}`];

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      return cached.price;
    }

    const response = await this.httpService.axiosRef.get(
      `https://eapi.binance.com/eapi/v1/index?underlying=${crypto}${pair}`,
    );

    const price = parseFloat(response.data.indexPrice);
    this.prices[`${crypto}${pair}`] = { price, timestamp: now };

    return price;
  }

  async getSolanaPrice(): Promise<number> {
    return this.getPrice('SOL');
  }

  async getBitcoinPrice(): Promise<number> {
    return this.getPrice('BTC');
  }

  async getEthereumPrice(): Promise<number> {
    return this.getPrice('ETH');
  }

  async getSuiPrice(): Promise<number> {
    return this.getPrice('ETH');
  }

}

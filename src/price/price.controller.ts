import { Controller, Get } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('all')
  async getAllPrices() {
    return {
      SOL: await this.priceService.getSolanaPrice(),
      BTC: await this.priceService.getBitcoinPrice(),
      ETH: await this.priceService.getEthereumPrice(),
    };
  }

  @Get('sol')
  async getSolanaPrice() {
    return this.priceService.getSolanaPrice();
  }
}

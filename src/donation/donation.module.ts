import { forwardRef, Module } from '@nestjs/common';
import { DonationController } from './donation.controller';
import { DonationService } from './donation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { PriceModule } from 'src/price/price.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    forwardRef(() => BlockchainModule),
    PriceModule,
  ],
  controllers: [DonationController],
  providers: [DonationService],
  exports: [DonationService],
})
export class DonationModule {}

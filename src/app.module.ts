import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { StreamerModule } from './streamer/streamer.module';
import { DonationModule } from './donation/donation.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { HealthModule } from './health/health.module';
import { validate } from './env.validation';
import { WalletModule } from './wallet/wallet.module';
import { PriceModule } from './price/price.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ScheduleModule.forRoot(),
    StreamerModule,
    DonationModule,
    PrismaModule,
    AuthModule,
    BlockchainModule,
    HealthModule,
    WalletModule,
    PriceModule,
  ],
})
export class AppModule {}

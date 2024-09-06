import { Module } from '@nestjs/common';
import { StreamerController } from './streamer.controller';
import { StreamerService } from './streamer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [StreamerController],
  providers: [StreamerService],
  exports: [StreamerService],
})
export class StreamerModule {}

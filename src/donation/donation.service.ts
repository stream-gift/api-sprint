import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, DonationStatus } from '@prisma/client';
import { CreateDonationDto } from './dto/create-donation.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { WAIT_TIME_FOR_DONATION_IN_SECONDS } from 'src/common/constants';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { cleanText } from 'src/common/utils/profanity';
import { PriceService } from 'src/price/price.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DonationService {
  private readonly logger = new Logger(DonationService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @Inject(forwardRef(() => BlockchainService))
    private BlockchainService: BlockchainService,
    private priceService: PriceService,
  ) {}

  async donate({
    message,
    name,
    amount,
    username,
    currency,
  }: CreateDonationDto) {
    const streamer = await this.prisma.streamer.findFirst({
      where: { username },
    });

    if (!streamer) {
      throw new NotFoundException('Streamer not found');
    }

    let address = await this.prisma.address.findFirst({
      where: {
        OR: [
          {
            lockedUntil: {
              lt: new Date(),
            },
          },
          { lockedUntil: null },
        ],
      },
    });

    if (!address) {
      address = await this.walletService.createWallet();
    }

    const solanaPrice = await this.priceService.getSolanaPrice();
    const solanaPriceCents = Math.floor(solanaPrice * 100);

    const donationAliveUntil = new Date(
      Date.now() + WAIT_TIME_FOR_DONATION_IN_SECONDS * 1000,
    );

    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.create({
        data: {
          message: cleanText(message),
          name,
          currency,
          amount: amount * LAMPORTS_PER_SOL,
          amountFloat: amount,
          amountAtomic: amount * LAMPORTS_PER_SOL,
          amountUsd: Math.floor(amount * solanaPriceCents),
          streamerId: streamer.id,
          addressId: address.id,
          status: DonationStatus.PENDING, // Set initial status
          pendingUntil: donationAliveUntil,
        },
      });

      await prisma.address.update({
        where: { id: address.id },
        data: {
          lockedUntil: donationAliveUntil,
        },
      });

      this.BlockchainService.listenToAddress(address.address);

      return {
        donation,
        address: { address: address.address, currency: address.currency },
      };
    });
  }

  async getDonation(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: { address: true },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return { donation };
  }

  async getDonationEvents(token: string, since: string) {
    const streamer = await this.prisma.streamerToken.findFirst({
      where: { token },
    });

    if (!streamer) {
      throw new NotFoundException('Streamer not found');
    }

    return this.prisma.donation.findMany({
      where: {
        streamerId: streamer.streamerId,
        status: DonationStatus.COMPLETED,
        updatedAt: {
          gt: new Date(parseInt(since)),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processDonation(
    donationId: string,
    transactionHash: string,
    transactionSender: string,
    transactionSenderDomainName: string | null,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
      });

      if (!donation) {
        throw new NotFoundException('Donation not found');
      }

      await prisma.streamerBalance.update({
        where: {
          streamerId_currency: {
            streamerId: donation.streamerId,
            currency: Currency.SOL,
          },
        },
        data: { balance: { increment: donation.amount } },
      });

      await prisma.address.update({
        where: { id: donation.addressId },
        data: { lockedUntil: null },
      });

      return prisma.donation.update({
        where: { id: donationId },
        data: {
          status: DonationStatus.COMPLETED,
          transactionHash,
          transactionSender,
          transactionSenderDomainName,
        },
      });
    });
  }

  async getLeaderboard() {
    const topStreamersByDonationAmount = await this.prisma.donation.groupBy({
      by: ['streamerId'],
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    });

    const streamersWithDetails = await this.prisma.streamer.findMany({
      where: {
        id: {
          in: topStreamersByDonationAmount.map((item) => item.streamerId),
        },
      },
      select: {
        id: true,
        username: true,
        profileImage: true,
      },
    });

    // Combine the results
    const result = topStreamersByDonationAmount.map((item) => ({
      ...streamersWithDetails.find(
        (streamer) => streamer.id === item.streamerId,
      ),
      totalDonationAmount: item._sum.amount,
    }));

    return result;
  }

  /**
   * @description Move status to failed for donations that were not paid until expiry
   **/
  @Cron(CronExpression.EVERY_10_MINUTES)
  async failUnpaidDonations() {
    this.logger.log('Updating unpaid donations');
    await this.prisma.donation.updateMany({
      where: {
        status: DonationStatus.PENDING,
        pendingUntil: { lt: new Date() },
      },
      data: { status: DonationStatus.FAILED },
    });
  }
}

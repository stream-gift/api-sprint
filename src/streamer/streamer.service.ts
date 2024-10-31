import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Currency,
  DonationStatus,
  StreamerWithdrawalStatus,
} from '@prisma/client';
import { OnboardDto } from './dto/onboard.dto';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Injectable()
export class StreamerService {
  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
  ) {}

  async onboard(
    userId: string,
    {
      username,
      address,
      profileImage,
      profileBanner,
      profileColor,
    }: OnboardDto,
  ) {
    const profile = await this.prisma.streamer.findUnique({
      where: { id: userId },
    });

    if (profile) {
      throw new BadRequestException('Already onboarded!');
    }

    return this.prisma.$transaction(async (prisma) => {
      const streamer = await prisma.streamer.create({
        data: {
          id: userId,
          username,
          profileImage,
          profileBanner,
          profileColor,
        },
      });

      await prisma.streamerBalance.create({
        data: {
          streamerId: streamer.id,
          balance: 0,
          pending: 0,
          currency: Currency.SUI,
        },
      });

      await prisma.streamerSettings.create({
        data: {
          streamerId: streamer.id,
        },
      });

      await prisma.streamerToken.create({
        data: {
          streamerId: streamer.id,
        },
      });

      await prisma.streamerAddress.create({
        data: {
          streamerId: streamer.id,
          address,
          currency: Currency.SUI,
        },
      });

      return {
        ...streamer,
        streamerDomainName:
          await this.blockchainService.getDomainNameFromAddress(address),
      };
    });
  }

  async getProfile(username: string) {
    return this.prisma.streamer.findFirst({
      where: {
        OR: [
          {
            username: {
              equals: username,
              mode: 'insensitive',
            },
          },
          { id: username },
        ],
      },
      select: {
        id: true,
        username: true,
        profileImage: true,
        profileBanner: true,
        profileColor: true,
      },
    });
  }

  async checkUsername(username: string) {
    return this.prisma.streamer
      .findUnique({
        where: { username },
      })
      .then((streamer) => !!streamer);
  }

  async getStreamerData(token: string) {
    const streamerToken = await this.prisma.streamerToken.findFirst({
      where: { token },
    });

    if (!streamerToken) {
      throw new NotFoundException('Streamer not found');
    }

    const streamer = await this.prisma.streamer.findUnique({
      where: { id: streamerToken.streamerId },
    });

    const [settings] = await Promise.all([
      this.prisma.streamerSettings.findUnique({
        where: { streamerId: streamer.id },
      }),
    ]);

    return {
      streamer,
      settings,
    };
  }

  async getSettings(streamerId: string) {
    return this.prisma.streamerSettings.findUnique({
      where: { streamerId },
    });
  }

  async setSettings(streamerId: string, settings: any) {
    return this.prisma.streamerSettings.update({
      where: { streamerId },
      data: { ...settings, streamerId },
    });
  }

  async getAddresses(streamerId: string) {
    return this.prisma.streamerAddress.findMany({
      where: { streamerId },
    });
  }

  async addAddress(streamerId: string, address: string, currency: Currency) {
    return this.prisma.streamerAddress.create({
      data: { streamerId, address, currency },
    });
  }

  async removeAddress(streamerId: string, address: string, currency: Currency) {
    const totalAddresses = await this.prisma.streamerAddress.count({
      where: { streamerId },
    });

    if (totalAddresses === 1) {
      throw new BadRequestException('Cannot remove only address');
    }

    const addressToRemove = await this.prisma.streamerAddress.findFirst({
      where: { streamerId, address, currency },
    });

    if (!addressToRemove) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.streamerAddress.delete({
      where: { id: addressToRemove.id },
    });
  }

  async getDashboard(streamerId: string) {
    const [donations, withdrawals, balances, token] = await Promise.all([
      this.prisma.donation.findMany({
        where: {
          streamerId,
          status: DonationStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.streamerWithdrawal.findMany({ where: { streamerId } }),
      this.prisma.streamerBalance.findMany({ where: { streamerId } }),
      this.prisma.streamerToken
        .findFirst({ where: { streamerId } })
        .then((token) => token?.token),
    ]);

    const [
      totalDonations,
      totalDonationsAmount,
      last24HoursDonations,
      last24HoursDonationsAmount,
      last7DaysDonations,
      last7DaysDonationsAmount,
    ] = await Promise.all([
      this.prisma.donation.count({
        where: { streamerId, status: DonationStatus.COMPLETED },
      }),
      this.prisma.donation.aggregate({
        where: { streamerId, status: DonationStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.donation.count({
        where: {
          streamerId,
          status: DonationStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.donation.aggregate({
        where: {
          streamerId,
          status: DonationStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _sum: { amount: true },
      }),
      this.prisma.donation.count({
        where: {
          streamerId,
          status: DonationStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.donation.aggregate({
        where: {
          streamerId,
          status: DonationStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      donations,
      withdrawals,
      balances,
      aggregated: {
        totalDonations,
        totalDonationsAmount: totalDonationsAmount._sum.amount,
        last24HoursDonations,
        last24HoursDonationsAmount: last24HoursDonationsAmount._sum.amount,
        last7DaysDonations,
        last7DaysDonationsAmount: last7DaysDonationsAmount._sum.amount,
      },
    };
  }

  async getDonations(streamerId: string) {
    return this.prisma.donation.findMany({
      where: { streamerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBalances(streamerId: string) {
    return this.prisma.streamerBalance.findMany({
      where: { streamerId },
    });
  }

  async getWithdrawals(streamerId: string) {
    return this.prisma.streamerWithdrawal.findMany({
      where: { streamerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(streamerId: string, amount: number, address: string) {
    const balances = await this.prisma.streamerBalance.findMany({
      where: { streamerId },
    });

    if (
      balances.find((balance) => balance.currency === Currency.SUI)?.balance <
      amount
    ) {
      throw new NotFoundException('Insufficient funds');
    }

    const withdrawal = await this.prisma.$transaction(async (prisma) => {
      await prisma.streamerBalance.update({
        where: { streamerId_currency: { streamerId, currency: Currency.SUI } },
        data: {
          balance: { decrement: amount },
          pending: { increment: amount },
        },
      });

      return prisma.streamerWithdrawal.create({
        data: {
          streamerId,
          currency: Currency.SUI,
          amount: amount,
          amountFloat: amount / LAMPORTS_PER_SOL,
          amountAtomic: amount,
          address,
          status: StreamerWithdrawalStatus.PENDING,
        },
      });
    });

    this.blockchainService.initiateWithdrawal(withdrawal);

    return withdrawal;
  }

  async getToken(streamerId: string) {
    const token = await this.prisma.streamerToken
      .findUnique({ where: { streamerId } })
      .then((token) => token?.token);

    return token;
  }

  async refreshToken(streamerId: string) {
    const uuid = uuidv4();
    const token = await this.prisma.streamerToken
      .update({
        where: { streamerId },
        data: { token: uuid },
      })
      .then(() => uuid);

    return { token };
  }
}

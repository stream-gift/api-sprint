import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

import * as bip39 from 'bip39';
import { Currency } from '@prisma/client';
import { Keypair } from '@solana/web3.js';

@Injectable()
export class WalletService {
  private logger = new Logger('WalletService');

  private mnemonic: string;
  private seed: Buffer;

  private mainWallet: Keypair;
  private mainWalletPublicKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.mnemonic = this.configService.get<string>('SUI_WALLET_MNEMONIC');

    this.seed = bip39.mnemonicToSeedSync(this.mnemonic);

    const mainWalletDerivePath = "m/44'/784'/0'/0'/0'";

    const keypair = Ed25519Keypair.deriveKeypair(
      this.mnemonic,
      mainWalletDerivePath,
    );

    // const mainWalletDerivedKey = derivePath(
    //   mainWalletDerivePath,
    //   this.seed.toString('hex'),
    // ).key;

    // this.mainWallet = Keypair.fromSeed(mainWalletDerivedKey);
    this.mainWalletPublicKey = keypair.getPublicKey().toSuiAddress();

    this.logger.log(`Main wallet connected: ${this.mainWalletPublicKey}`);
  }

  async createWallet() {
    const maxExistingAddress = await this.prisma.address.findFirst({
      orderBy: {
        index: 'desc',
      },
    });

    // Start at 1, because main wallet is at 0
    const index = maxExistingAddress ? maxExistingAddress.index + 1 : 1;

    const path = `m/44'/784'/${index}'/0'/0'`;
    const wallet = Ed25519Keypair.deriveKeypairFromSeed(
      this.seed.toString('hex'),
      path,
    );
    const address = wallet.toSuiAddress();

    return this.prisma.address.create({
      data: {
        address,
        index,
        currency: Currency.SUI,
      },
    });
  }

  async getWalletKeypairFromAddress(address: string) {
    const { index } = await this.prisma.address.findUnique({
      where: { address },
    });

    const path = `m/44'/784'/${index}'/0'/0'`;

    return Ed25519Keypair.deriveKeypairFromSeed(
      this.seed.toString('hex'),
      path,
    );
  }
}

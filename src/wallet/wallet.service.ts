import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import * as bip39 from 'bip39';
import { Currency } from '@prisma/client';

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
    this.mnemonic = this.configService.get<string>('SOLANA_WALLET_MNEMONIC');
    this.seed = bip39.mnemonicToSeedSync(this.mnemonic);

    const mainWalletDerivePath = "m/44'/501'/0'/0'";
    const mainWalletDerivedKey = derivePath(
      mainWalletDerivePath,
      this.seed.toString('hex'),
    ).key;

    this.mainWallet = Keypair.fromSeed(mainWalletDerivedKey);
    this.mainWalletPublicKey = this.mainWallet.publicKey.toBase58();

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

    const path = `m/44'/501'/${index}'/0'`;
    const derivedKey = derivePath(path, this.seed.toString('hex')).key;
    const wallet = Keypair.fromSeed(derivedKey);

    const address = wallet.publicKey.toBase58();

    return this.prisma.address.create({
      data: {
        address,
        index,
        currency: Currency.SOL,
      },
    });
  }

  async getWalletKeypairFromAddress(address: string) {
    const { index } = await this.prisma.address.findUnique({
      where: { address },
    });

    const path = `m/44'/501'/${index}'/0'`;
    const derivedKey = derivePath(path, this.seed.toString('hex')).key;

    return Keypair.fromSeed(derivedKey);
  }
}

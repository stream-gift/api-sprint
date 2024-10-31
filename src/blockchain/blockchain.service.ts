import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import { getAllDomains, reverseLookup } from '@bonfida/spl-name-service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DonationService } from '../donation/donation.service';
import {
  DonationStatus,
  StreamerWithdrawal,
  StreamerWithdrawalStatus,
} from '@prisma/client';
import { SOLANA_COMMITMENT, MIST_PER_SUI, SUI_COMMITMENT } from 'src/common/constants';
import { WalletService } from 'src/wallet/wallet.service';
import { SuiClient } from '@mysten/sui.js/client'
import { Cron, CronExpression } from '@nestjs/schedule';


type AccountActivity = { 
  digest: string,
  type: string,
  gasFee: string,
  status: string,
  sender: string,
  timestampMs: number,
  interactAddresses: InteractAddresses,
  coinChanges: CoinChanges,
  nftChanges: NFTChanges
  nextPageCursor: number
}

type NFTChanges = {
  objectId: string,
  objectType: string,
  marketPlace: string,
  imageURL: string,
  name: string,
  packageId: string,
  amount: string,
  price: string
}

type CoinChanges = {
  amount: string,
  coinAddress: string,
  symbol: string,
  decimal: string,
  logo: string,
}
type InteractAddresses = {
  address: string,
  type: string,
  name: string,
  logo: string
}
@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);

  private connection:Connection
  private client: SuiClient
  private subscriptions: Map<string, number> = new Map();
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => DonationService))
    private donationService: DonationService,
    private walletService: WalletService,
  ) {

    const suiHttpEndpoint = this.configService.get<string>('SUI_HTTP_ENDPOINT');
    const suiWsEndpoint = this.configService.get<string>('SUI_WS_ENDPOINT');
    const solanaHttpEndpoint = this.configService.get<string>('SOLANA_HTTP_ENDPOINT')
    const solanaWsEndpoint = this.configService.get<string>('SOLANA_WS_ENDPOINT')

    this.connection = new Connection(solanaHttpEndpoint, {wsEndpoint: solanaWsEndpoint} )
    // this.connection = new SuiClient({
    //   url: httpEndpoint,
    // }) 

    this.client = new SuiClient({
      url: suiHttpEndpoint,
    })
  }

  async onModuleInit() {
    await this.startListeningToAllAddresses();
  }

  async onModuleDestroy() {
    for (const address of this.subscriptions.keys()) {
      await this.stopListeningToAddress(address);
    }
  }

  private async startListeningToAllAddresses() {
    const addresses = await this.prisma.address.findMany({
      where: { lockedUntil: { gt: new Date() } },
    });

    for (const address of addresses) {
      await this._listenToAddress(address.address);
    }
  }

  async listenToAddress(address: string) {
    if (this.subscriptions.has(address)) {
      this.logger.log(`Already listening to address: ${address}`);
      return;
    }

    const donation = await this.prisma.donation.findFirst({
      where: {
        address: { address },
        status: DonationStatus.PENDING,
        pendingUntil: {
          gte: new Date(),
        },
      },
    });
    if (!donation) {
      this.logger.log(`No pending donation for address: ${address}`)
    } else {

      let donationCreationTimestamp = Math.floor(donation.createdAt.getTime() / 1000)
      async function checkAccountActivity(address:string) { // Works only for main-net.
        console.log(address)
        const api = `https://api.blockvision.org/v2/sui/account/activities`
        try {
            console.log('test')
            let res = await fetch(`${api}?address=${address}`, {
                headers: {
                    "x-api-key": `2oAgBR14BFpmT18cK5NpFUm1ZO2` ?? "",
                }
            });
            if (!res.ok) console.log(res.status, res.statusText)
            res = await res.json()
            console.log(`checkAccountActivity (${address}):`, res) //@ts-ignore
            return res.data
    
        } catch (error) { //@ts-ignore
            console.log(error?.message)
        }
        
        // return res?.result.data
    }
  
      let data:AccountActivity[] = await checkAccountActivity(address)
      for (let i = 0; i < data.length; i++) { 
        if (data[i].timestampMs > donationCreationTimestamp) {
          if (data[i].coinChanges.amount && data[i].sender != address) {
            this.logger.log(`Donation ${donation.id} is valid. Processing...`);

            const senderDomainName = await this.getDomainNameFromAddress(address);

            await this.donationService.processDonation(
              donation.id,
              data[i].digest,
              address,
              senderDomainName,
            );
          }
        }
      }
      

    }

    
  }
  async _listenToAddress(address: string) {
    if (this.subscriptions.has(address)) {
      this.logger.log(`Already listening to address: ${address}`);
      return;
    }

    const publicKey = new PublicKey(address);
    const _subscriptionId = this.connection.onAccountChange(
      publicKey,
      async (newAccountInfo, context) => {
        this.logger.log(`Transaction detected for address: ${address}`);

        const newBalanceLamports = newAccountInfo.lamports;
        const newBalance = newBalanceLamports / MIST_PER_SUI;

        const signatures = await this.connection.getSignaturesForAddress(
          publicKey,
          {},
          SUI_COMMITMENT,
        );
        const transactionHash = signatures[0].signature;

        const transaction = await this.connection.getTransaction(
          transactionHash,
          { commitment: SOLANA_COMMITMENT, maxSupportedTransactionVersion: 0 },
);
        const preBalances = transaction.meta.preBalances;
        const postBalances = transaction.meta.postBalances;
        const preBalance = preBalances[1];
        const postBalance = postBalances[1];
        const amountLamports = postBalance - preBalance;
        const amount = amountLamports / MIST_PER_SUI;
        const sender = transaction.transaction.message.staticAccountKeys[0];
        const senderAddress = sender.toBase58();

        this.logger.log(`Received ${amount} SOL at ${address} from ${senderAddress}! Total Balance: ${newBalance} SOL`);
        // Process the donation
        const donation = await this.prisma.donation.findFirst({
          where: {
            address: { address },
            status: DonationStatus.PENDING,
            pendingUntil: {
              gte: new Date(),
            },
          },
        });

        if (!donation) {
          this.logger.log(
            `No pending donation found for address: ${address}, returning.`,
          );
          await this.stopListeningToAddress(address);
          return;
        } else {
          this.logger.log(
            `Donation ${donation.id} found for address: ${address}`,
          );

          if (amountLamports < donation.amountAtomic) {
            await this.prisma.donation.update({
              where: { id: donation.id },
              data: {
                status: DonationStatus.FAILED,
                transactionHash,
                transactionSender: senderAddress,
              },
            });

            await this.prisma.address.update({
              where: { address },
              data: { lockedUntil: null },
            });

            this.logger.error(
              `Donation ${donation.id} failed due to lower amount than expected. Expected ${donation.amountFloat} SOL, received ${amount} SOL.`,
            );
          } else {
            this.logger.log(`Donation ${donation.id} is valid. Processing...`);

            const senderDomainName = await this.getDomainNameFromAddress(senderAddress);

            await this.donationService.processDonation(
              donation.id,
              transactionHash,
              senderAddress,
              senderDomainName,
            );
          }

          await this.stopListeningToAddress(address);
        }
      },
      { commitment: SOLANA_COMMITMENT },
    );

    this.subscriptions.set(address, _subscriptionId);
    this.logger.log(`Started listening to address: ${address}`);
  }

  async startListeningToAddress(address: string) {
    return this._listenToAddress(address);
  }

  async stopListeningToAddress(address: string) {
    const subscriptionId = this.subscriptions.get(address);
    if (subscriptionId !== undefined) {
      await this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(address);
      this.logger.log(`Stopped listening to address: ${address}`);
    }
  }

  async getDomainNameFromAddress(address: string) {
    const domain = await this.checkSUINS(address)
    // const mainnetConnection = this.configService.get<string>(
    //   'SUI_MAINNET_HTTP_ENDPOINT',
    // )
    //   ? new Connection(
    //       this.configService.get<string>('SOLANA_MAINNET_HTTP_ENDPOINT'),
    //     )
    //   : this.connection;

    // const ownerWallet = new PublicKey(address);
    // const allDomainKeys = await getAllDomains(mainnetConnection, ownerWallet);

    // if (allDomainKeys.length === 0) {
    //   return null;
    // }

    // const [domainNameKey] = allDomainKeys;
    // const domainName = await reverseLookup(mainnetConnection, domainNameKey);

    return `${domain}.sui`;
  }


  async checkSUINS(address:string) { // Works only for main-net.
    const api = `https://api.blockvision.org/v2/sui/account/nfts`
    try {
        this.logger.log(`Checking SUINS address ${address}`)
        let res = await fetch(`${api}?account=${address}`, {
            headers: {
                "x-api-key": `2oAgBR14BFpmT18cK5NpFUm1ZO2` ?? "",
            }
        });
        if (!res.ok) console.log(res.status, res.statusText)
        res = await res.json() // @ts-ignore
        console.log(`checkSUINS (${address}):`, res?.result.data) //@ts-ignore
        const nfts:CollectionItem[] = res?.result.data //@ts-ignore
        const suins_index = nfts.findIndex(nft=> nft.collection == `0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration`)

        if (suins_index > -1) return nfts[suins_index]
    } catch (error) { //@ts-ignore
        console.log(error?.message)
    }

}
  async initiateWithdrawal(withdrawal: StreamerWithdrawal) {
    // Get sender wallet
    const addresses = await this.prisma.address.findMany();

    let senderPublicKey: PublicKey;

    for (const address of addresses) {
      const publicKey = new PublicKey(address.address);
      const balance = await this.connection.getBalance(publicKey);
      const balanceInSol = balance / MIST_PER_SUI;

      if (balanceInSol >= withdrawal.amountFloat) {
        senderPublicKey = publicKey;
        break;
      }
    }

    if (!senderPublicKey) {
      await this.prisma.streamerWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'FAILED' },
      });
      throw new Error('No sender address found');
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: new PublicKey(withdrawal.address),
        lamports: withdrawal.amountAtomic,
      }),
    );

    // const signature = await sendAndConfirmTransaction(
    //   this.connection,
    //   transaction,
    //   [
    //     await this.walletService.getWalletKeypairFromAddress(
    //       senderPublicKey.toBase58(),
    //     ),
    //   ],
    // );

    // await this.prisma.streamerWithdrawal.update({
    //   where: { id: withdrawal.id },
    //   data: {
    //     status: StreamerWithdrawalStatus.SENT,
    //     transactionHash: signature,
    //   },
    // });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSentWithdrawals() {
    const withdrawals = await this.prisma.streamerWithdrawal.findMany({
      where: { status: StreamerWithdrawalStatus.SENT },
    });

    for (const withdrawal of withdrawals) {
      const transaction = await this.connection.getParsedTransaction(
        withdrawal.transactionHash,
        { maxSupportedTransactionVersion: 0 },
      );

      if (!transaction) {
        continue;
      }

      // Withdrawal TX Failed
      if (transaction.meta.err) {
        this.prisma.$transaction([
          this.prisma.streamerWithdrawal.update({
            where: { id: withdrawal.id },
            data: { status: StreamerWithdrawalStatus.FAILED },
          }),
          this.prisma.streamerBalance.update({
            where: {
              streamerId_currency: {
                streamerId: withdrawal.streamerId,
                currency: withdrawal.currency,
              },
            },
            data: {
              balance: { increment: withdrawal.amountFloat },
              pending: { decrement: withdrawal.amountFloat },
            },
          }),
        ]);
      } else {
        await this.prisma.$transaction([
          this.prisma.streamerWithdrawal.update({
            where: { id: withdrawal.id },
            data: { status: StreamerWithdrawalStatus.COMPLETED },
          }),
          this.prisma.streamerBalance.update({
            where: {
              streamerId_currency: {
                streamerId: withdrawal.streamerId,
                currency: withdrawal.currency,
              },
            },
            data: {
              pending: 0,
            },
          }),
        ]);
      }
    }
  }
}

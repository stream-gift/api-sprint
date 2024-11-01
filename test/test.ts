import { DonationStatus } from '@prisma/client';

type AccountActivity = {
  digest: string;
  type: string;
  gasFee: string;
  status: string;
  sender: string;
  timestampMs: number;
  interactAddresses: InteractAddresses;
  coinChanges: CoinChanges;
  nftChanges: NFTChanges;
  nextPageCursor: number;
};

type NFTChanges = {
  objectId: string;
  objectType: string;
  marketPlace: string;
  imageURL: string;
  name: string;
  packageId: string;
  amount: string;
  price: string;
};

type CoinChanges = {
  amount: string;
  coinAddress: string;
  symbol: string;
  decimal: string;
  logo: string;
};
type InteractAddresses = {
  address: string;
  type: string;
  name: string;
  logo: string;
};

async function listenToAddress(address: string) {
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
    this.logger.log(`No pending donation for address: ${address}`);
  } else {
    let donationCreationTimestamp = Math.floor(
      donation.createdAt.getTime() / 1000,
    );
    let res = await this.httpService.axiosRef.get(
      `https://api.blockvision.org/v2/sui/account/activities?address=${address}`,
      {
        headers: {
          accept: 'application/json',
          'x-api-key': `2oAgBR14BFpmT18cK5NpFUm1ZO2`,
        },
      },
    );

    let data: AccountActivity[] = res.data;
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

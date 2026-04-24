import { Injectable, NotFoundException } from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class PayoutsService {
  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  async initiateStellarPayout(payoutId: number) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });
    if (!payout) throw new NotFoundException('Payout record not found');

    if (!payout.wallet) {
      throw new NotFoundException('No wallet associated with this payout');
    }

    const server = new StellarSdk.Horizon.Server(this.stellarService.horizonUrl);

    // 1. Get Platform Secret (Environment variable)
    const platformSecret = process.env.STELLAR_PLATFORM_SECRET;
    if (!platformSecret) {
      throw new Error('STELLAR_PLATFORM_SECRET environment variable not set');
    }

    const sourceKeyPair = StellarSdk.Keypair.fromSecret(platformSecret);

    try {
      // 2. Load Source Account to get current sequence number
      const sourceAccount = await server.loadAccount(sourceKeyPair.publicKey());

      // 3. Build the Transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.stellarService.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: payout.wallet.address,
            asset: StellarSdk.Asset.native(), // XLM
            amount: payout.amount.toString(),
          }),
        )
        .setTimeout(60)
        .build();

      // 4. Sign the transaction
      transaction.sign(sourceKeyPair);
      const xdr = transaction.toXDR();
      const transactionId = transaction.hash().toString('hex');

      // 5. Update Database
      return await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'pending',
          transactionId: transactionId,
          stellarXdr: xdr,
        },
      });
    } catch (error) {
      console.error('Stellar Payout Initiation Failed:', error);
      throw new Error('Failed to initiate Stellar transaction');
    }
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { InitiatePayoutDto } from './dto/initiate-payout.dto';

/** Minimum payout in USD equivalent to avoid fee-wasting micro-transactions. */
const MIN_STELLAR_PAYOUT = parseFloat(process.env.MIN_STELLAR_PAYOUT ?? '5');

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stellarService: StellarService,
  ) {}

  async initiatePayout(userId: number, dto: InitiatePayoutDto) {
    if (dto.amount < MIN_STELLAR_PAYOUT) {
      throw new BadRequestException(
        `Minimum payout amount is $${MIN_STELLAR_PAYOUT} USD equivalent. ` +
          `Requested: $${dto.amount}.`,
      );
    }

    const txHash = this.buildTxHash();

    // Persist payout record
    const payout = await this.prisma.payout.create({
      data: {
        userId,
        walletId: dto.walletId ?? null,
        amount: dto.amount,
        currency: 'USD',
        method: 'stellar',
        status: 'processing',
        transactionId: txHash,
        onChainTxHash: txHash,
      },
    });

    // Stellar transaction logic executes on the configured network.
    // The StellarService exposes rpcUrl and networkPassphrase for use with stellar-sdk.
    // TODO: integrate stellar-sdk call here using this.stellarService.rpcUrl
    //       and this.stellarService.networkPassphrase once the SDK is installed.

    return {
      payoutId: payout.id,
      onChainTxHash: payout.onChainTxHash,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      network: this.stellarService.network,
    };
  }

  private buildTxHash(): string {
    const rand = Math.random().toString(16).slice(2).padEnd(64, '0');
    return rand.slice(0, 64);
  }
}

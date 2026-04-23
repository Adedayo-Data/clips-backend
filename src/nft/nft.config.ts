import { Injectable } from '@nestjs/common';

/**
 * NFT royalty configuration from environment variables.
 *
 * CREATOR_ROYALTY_BPS   — fallback creator royalty bps when clip has none (default 1000 = 10%)
 * PLATFORM_ROYALTY_BPS  — ClipCash platform cut (default 100 = 1%)
 * PLATFORM_WALLET_ADDRESS — ClipCash treasury wallet
 */
@Injectable()
export class NftConfig {
  readonly creatorRoyaltyBps: number;
  readonly platformRoyaltyBps: number;
  readonly platformWallet: string;

  constructor() {
    this.creatorRoyaltyBps = parseInt(process.env.CREATOR_ROYALTY_BPS ?? '1000', 10);
    this.platformRoyaltyBps = parseInt(process.env.PLATFORM_ROYALTY_BPS ?? '100', 10);
    this.platformWallet = process.env.PLATFORM_WALLET_ADDRESS ?? '';
  }
}

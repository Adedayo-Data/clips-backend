import { Injectable } from '@nestjs/common';

@Injectable()
export class NftConfig {
  readonly platformRoyaltyBps: number;
  readonly creatorRoyaltyBps: number;
  readonly platformWallet: string;

  constructor() {
    this.platformRoyaltyBps = parseInt(process.env.PLATFORM_ROYALTY_BPS ?? '100', 10);
    this.creatorRoyaltyBps = parseInt(process.env.CREATOR_ROYALTY_BPS ?? '1000', 10);
    this.platformWallet = process.env.PLATFORM_WALLET_ADDRESS ?? '';
  }
}

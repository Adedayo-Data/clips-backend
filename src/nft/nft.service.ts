import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NftConfig } from './nft.config';
import { MintClipDto } from './dto/mint-clip.dto';

export interface RoyaltyRecipient {
  wallet: string;
  bps: number;
  label: string;
}

export interface MintTransaction {
  clipId: string;
  metadataUri: string;
  royalties: RoyaltyRecipient[];
  builtAt: string;
}

export interface MintResult {
  txHash: string;
  transaction: MintTransaction;
}

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);

  constructor(private readonly config: NftConfig) {}

  async mintClip(dto: MintClipDto): Promise<MintResult> {
    this.validateConfig();
    const royalties = this.buildRoyalties(dto.creatorWallet);
    const transaction: MintTransaction = {
      clipId: dto.clipId,
      metadataUri: dto.metadataUri ?? '',
      royalties,
      builtAt: new Date().toISOString(),
    };
    const txHash = await this.submitTransaction(transaction);
    this.logger.log(`Minted clip ${dto.clipId} | tx: ${txHash}`);
    return { txHash, transaction };
  }

  buildRoyalties(creatorWallet: string): RoyaltyRecipient[] {
    return [
      { wallet: creatorWallet, bps: this.config.creatorRoyaltyBps, label: 'creator' },
      { wallet: this.config.platformWallet, bps: this.config.platformRoyaltyBps, label: 'platform' },
    ];
  }

  private validateConfig(): void {
    if (!this.config.platformWallet) {
      throw new BadRequestException('PLATFORM_WALLET_ADDRESS is not configured.');
    }
  }

  private async submitTransaction(tx: MintTransaction): Promise<string> {
    await Promise.resolve();
    return `sim_tx_${tx.clipId}_${Date.now()}`;
  }
}

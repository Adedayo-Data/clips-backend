import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NftConfig } from './nft.config';
import { MintClipDto, ROYALTY_BPS_DEFAULT } from './dto/mint-clip.dto';

export interface RoyaltyRecipient {
  wallet: string;
  /** Basis points (100 = 1%) */
  bps: number;
  label: 'creator' | 'platform';
}

export interface MintTransaction {
  clipId: string;
  metadataUri: string;
  /** Ordered royalty recipients — passed directly to the Soroban contract */
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

  /**
   * Build and submit a mint transaction.
   *
   * Royalty resolution order:
   *   1. `dto.royaltyBps`  — caller-supplied per-clip value
   *   2. `config.creatorRoyaltyBps` — env-level default (CREATOR_ROYALTY_BPS)
   *   3. Hard-coded fallback: 1000 bps (10%)
   */
  async mintClip(dto: MintClipDto): Promise<MintResult> {
    this.validateConfig();

    const creatorBps = dto.royaltyBps ?? this.config.creatorRoyaltyBps ?? ROYALTY_BPS_DEFAULT;
    const royalties = this.buildRoyalties(dto.creatorWallet, creatorBps);

    const transaction: MintTransaction = {
      clipId: dto.clipId,
      metadataUri: dto.metadataUri ?? '',
      royalties,
      builtAt: new Date().toISOString(),
    };

    // TODO: replace stub with real Soroban SDK call, e.g.:
    //   const server = new SorobanRpc.Server(process.env.STELLAR_RPC_URL);
    //   const txHash = await server.sendTransaction(buildSorobanTx(transaction));
    const txHash = await this.submitTransaction(transaction);

    this.logger.log(
      `Minted clip ${dto.clipId} | tx: ${txHash} | royalties: ${JSON.stringify(royalties)}`,
    );

    return { txHash, transaction };
  }

  /**
   * Assemble royalty recipients.
   * Creator entry always comes first (matches most NFT standards).
   */
  buildRoyalties(creatorWallet: string, creatorBps: number): RoyaltyRecipient[] {
    return [
      { wallet: creatorWallet, bps: creatorBps, label: 'creator' },
      { wallet: this.config.platformWallet, bps: this.config.platformRoyaltyBps, label: 'platform' },
    ];
  }

  private validateConfig(): void {
    if (!this.config.platformWallet) {
      throw new BadRequestException(
        'PLATFORM_WALLET_ADDRESS is not configured. Cannot mint NFT.',
      );
    }
  }

  /** Stub — replace with real chain submission */
  private async submitTransaction(tx: MintTransaction): Promise<string> {
    await Promise.resolve();
    return `sim_tx_${tx.clipId}_${Date.now()}`;
  }
}

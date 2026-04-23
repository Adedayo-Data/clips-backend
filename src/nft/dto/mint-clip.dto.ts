import { IsString, IsNotEmpty, IsOptional, IsUrl, IsInt, Min, Max } from 'class-validator';

export const ROYALTY_BPS_DEFAULT = 1000;
export const ROYALTY_BPS_MIN = 0;
export const ROYALTY_BPS_MAX = 1500;

export class MintClipDto {
  /** ID of the clip being minted */
  @IsString()
  @IsNotEmpty()
  clipId: string;

  /** Creator's wallet address — receives the creator royalty share */
  @IsString()
  @IsNotEmpty()
  creatorWallet: string;

  /**
   * Creator royalty in basis points (0–1500 = 0–15%).
   * Defaults to 1000 (10%) when omitted.
   */
  @IsOptional()
  @IsInt()
  @Min(ROYALTY_BPS_MIN)
  @Max(ROYALTY_BPS_MAX)
  royaltyBps?: number;

  /** Optional on-chain metadata URI (IPFS / Arweave) */
  @IsOptional()
  @IsUrl()
  metadataUri?: string;
}

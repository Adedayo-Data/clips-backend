import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class MintClipDto {
  @IsString()
  @IsNotEmpty()
  clipId: string;

  @IsString()
  @IsNotEmpty()
  creatorWallet: string;

  @IsOptional()
  @IsUrl()
  metadataUri?: string;
}

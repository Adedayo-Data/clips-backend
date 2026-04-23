import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NftService, MintResult } from './nft.service';
import { MintClipDto } from './dto/mint-clip.dto';

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  /**
   * POST /nft/mint
   *
   * Mints a clip as an NFT with split royalties.
   * `royaltyBps` is optional (0–1500); defaults to 1000 (10%) when omitted.
   */
  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  async mint(@Body() dto: MintClipDto): Promise<MintResult> {
    return this.nftService.mintClip(dto);
  }
}

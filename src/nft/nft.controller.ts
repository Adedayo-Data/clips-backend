import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NftService, MintResult } from './nft.service';
import { MintClipDto } from './dto/mint-clip.dto';

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  async mint(@Body() dto: MintClipDto): Promise<MintResult> {
    return this.nftService.mintClip(dto);
  }
}

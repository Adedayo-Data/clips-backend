import { Controller, Post, Body } from '@nestjs/common';
import { PayoutsService } from './payouts.service';

interface InitiateStellarPayoutDto {
  payoutId: number;
}

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post('initiate-stellar')
  async initiateStellar(@Body() dto: InitiateStellarPayoutDto) {
    return this.payoutsService.initiateStellarPayout(dto.payoutId);
  }
}

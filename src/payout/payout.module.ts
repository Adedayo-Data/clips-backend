import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StellarModule } from '../stellar/stellar.module';
import { PAYOUT_STATUS_QUEUE } from './payout-status.queue';
import { PayoutStatusProcessor } from './payout-status.processor';
import { PayoutStatusScheduler } from './payout-status.scheduler';

@Module({
  imports: [
    PrismaModule,
    StellarModule,
    BullModule.registerQueue({ name: PAYOUT_STATUS_QUEUE }),
  ],
  controllers: [PayoutController],
  providers: [PayoutService, PayoutStatusProcessor, PayoutStatusScheduler],
})
export class PayoutModule {}

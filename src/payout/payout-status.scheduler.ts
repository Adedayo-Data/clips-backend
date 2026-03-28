import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  PAYOUT_STATUS_POLL_JOB,
  PAYOUT_STATUS_QUEUE,
} from './payout-status.queue';

@Injectable()
export class PayoutStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(PayoutStatusScheduler.name);

  constructor(
    @InjectQueue(PAYOUT_STATUS_QUEUE)
    private readonly payoutStatusQueue: Queue,
  ) {}

  async onModuleInit() {
    const intervalMs = parseInt(
      process.env.PAYOUT_STATUS_POLL_INTERVAL_MS ?? '60000',
      10,
    );

    await this.payoutStatusQueue.add(
      PAYOUT_STATUS_POLL_JOB,
      {},
      {
        jobId: PAYOUT_STATUS_POLL_JOB,
        repeat: { every: intervalMs },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.logger.log(`Scheduled payout status poller every ${intervalMs}ms`);
  }
}

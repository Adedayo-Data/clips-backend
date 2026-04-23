import { Module } from '@nestjs/common';
import { StellarConfig } from './stellar.config';
import { StellarPaymentListener } from './stellar-payment.listener';

@Module({
  providers: [StellarConfig, StellarPaymentListener],
  exports: [StellarConfig],
})
export class StellarModule {}

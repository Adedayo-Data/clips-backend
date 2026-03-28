import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WalletService } from './wallet.service';
import { LoginGuard } from '../auth/guards/login.guard';
import { ConnectWalletDto } from './dto/connect-wallet.dto';

@UseGuards(LoginGuard)
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /** POST /wallets/connect — connect a new wallet */
  @Post('connect')
  connectWallet(@Body() dto: ConnectWalletDto, @Req() req: Request) {
    const userId = Number((req as any).user?.id ?? 0);
    return this.walletService.connectWallet(userId, dto);
  }

  /** GET /wallets — list current user's wallets (addresses masked) */
  @Get()
  getWallets(@Req() req: Request) {
    const userId = Number((req as any).user?.id ?? 0);
    return this.walletService.getWalletsByUserId(userId);
  }

  /** GET /wallets/:id — get a single wallet by ID (address masked) */
  @Get(':id')
  getWallet(@Param('id') id: string, @Req() req: Request) {
    const userId = Number((req as any).user?.id ?? 0);
    return this.walletService.getWalletById(Number(id), userId);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StrKey } from '@stellar/stellar-sdk';
import { ConnectWalletDto } from './dto/connect-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mask a wallet address for privacy, showing only the last 6 characters.
   * e.g. "GBXZFVGP3QW5NXVZ4KPRQ" → "******NXVZ4KPRQ" → "******KPRQ"  (last 6)
   */
  maskAddress(address: string): string {
    if (!address) return '';
    if (address.length <= 6) return address;
    return `******${address.slice(-6)}`;
  }

  private applyMask(wallet: any) {
    return { ...wallet, address: this.maskAddress(wallet.address) };
  }

  async getWalletsByUserId(userId: number) {
    const wallets = await this.prisma.wallet.findMany({ where: { userId } });
    return wallets.map((w) => this.applyMask(w));
  }

  async getWalletById(id: number, userId: number) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id, userId },
    });
    if (!wallet) throw new NotFoundException(`Wallet ${id} not found`);
    return this.applyMask(wallet);
  }

  /**
   * Connect a Stellar wallet.
   * Validates address, checks for duplicates, and upserts.
   */
  async connectWallet(userId: number, dto: ConnectWalletDto) {
    // 1. Validate Stellar address
    if (!StrKey.isValidEd25519PublicKey(dto.address)) {
      throw new BadRequestException('Invalid Stellar address');
    }

    // 2. Upsert logic (check for existing userId + address)
    // Since the schema doesn't have a composite unique index, we check first.
    let wallet = await this.prisma.wallet.findFirst({
      where: { userId, address: dto.address },
    });

    if (wallet) {
      // Update existing
      wallet = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          chain: dto.chain,
          type: dto.type,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          address: dto.address,
          chain: dto.chain,
          type: dto.type,
        },
      });
    }

    return this.applyMask(wallet);
  }
}

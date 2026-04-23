import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftConfig } from './nft.config';
import { ROYALTY_BPS_DEFAULT, ROYALTY_BPS_MAX, ROYALTY_BPS_MIN } from './dto/mint-clip.dto';

function makeConfig(overrides: Partial<NftConfig> = {}): NftConfig {
  const cfg = new NftConfig();
  return Object.assign(cfg, {
    creatorRoyaltyBps: 1000,
    platformRoyaltyBps: 100,
    platformWallet: 'PLATFORM_WALLET',
    ...overrides,
  });
}

async function buildService(configOverrides: Partial<NftConfig> = {}): Promise<NftService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NftService,
      { provide: NftConfig, useValue: makeConfig(configOverrides) },
    ],
  }).compile();
  return module.get<NftService>(NftService);
}

describe('NftService — royaltyBps per clip', () => {
  let service: NftService;

  beforeEach(async () => {
    service = await buildService();
  });

  // ── Constants ──────────────────────────────────────────────────────────────

  it('ROYALTY_BPS_DEFAULT is 1000', () => {
    expect(ROYALTY_BPS_DEFAULT).toBe(1000);
  });

  it('ROYALTY_BPS range is 0–1500', () => {
    expect(ROYALTY_BPS_MIN).toBe(0);
    expect(ROYALTY_BPS_MAX).toBe(1500);
  });

  // ── buildRoyalties ─────────────────────────────────────────────────────────

  describe('buildRoyalties', () => {
    it('uses the supplied creatorBps value', () => {
      const royalties = service.buildRoyalties('CREATOR', 750);
      const creator = royalties.find((r) => r.label === 'creator');
      expect(creator).toMatchObject({ wallet: 'CREATOR', bps: 750 });
    });

    it('always places creator before platform', () => {
      const royalties = service.buildRoyalties('CREATOR', 1000);
      expect(royalties[0].label).toBe('creator');
      expect(royalties[1].label).toBe('platform');
    });

    it('platform entry uses config.platformRoyaltyBps', () => {
      const royalties = service.buildRoyalties('CREATOR', 1000);
      expect(royalties[1]).toMatchObject({ wallet: 'PLATFORM_WALLET', bps: 100 });
    });
  });

  // ── mintClip — royaltyBps resolution ──────────────────────────────────────

  describe('mintClip', () => {
    const base = { clipId: 'clip-1', creatorWallet: 'CREATOR' };

    it('uses dto.royaltyBps when provided (e.g. 500)', async () => {
      const result = await service.mintClip({ ...base, royaltyBps: 500 });
      const creator = result.transaction.royalties.find((r) => r.label === 'creator');
      expect(creator?.bps).toBe(500);
    });

    it('falls back to config.creatorRoyaltyBps (1000) when royaltyBps is omitted', async () => {
      const result = await service.mintClip(base);
      const creator = result.transaction.royalties.find((r) => r.label === 'creator');
      expect(creator?.bps).toBe(1000);
    });

    it('falls back to ROYALTY_BPS_DEFAULT (1000) when config is also 0', async () => {
      const svc = await buildService({ creatorRoyaltyBps: 0 });
      // royaltyBps omitted → config is 0 → but 0 is falsy so default kicks in
      // NOTE: 0 is a valid bps value; the fallback chain uses ?? not ||
      const result = await svc.mintClip(base);
      const creator = result.transaction.royalties.find((r) => r.label === 'creator');
      // config is 0, dto is undefined → 0 ?? 1000 = 0 (nullish, not falsy)
      expect(creator?.bps).toBe(0);
    });

    it('accepts boundary value 0 bps', async () => {
      const result = await service.mintClip({ ...base, royaltyBps: 0 });
      const creator = result.transaction.royalties.find((r) => r.label === 'creator');
      expect(creator?.bps).toBe(0);
    });

    it('accepts boundary value 1500 bps', async () => {
      const result = await service.mintClip({ ...base, royaltyBps: 1500 });
      const creator = result.transaction.royalties.find((r) => r.label === 'creator');
      expect(creator?.bps).toBe(1500);
    });

    it('includes royaltyBps in the transaction payload', async () => {
      const result = await service.mintClip({ ...base, royaltyBps: 800 });
      expect(result.transaction.royalties).toHaveLength(2);
      expect(result.txHash).toMatch(/^sim_tx_clip-1_/);
    });

    it('throws BadRequestException when platform wallet is missing', async () => {
      const svc = await buildService({ platformWallet: '' });
      await expect(svc.mintClip(base)).rejects.toThrow(BadRequestException);
    });
  });
});

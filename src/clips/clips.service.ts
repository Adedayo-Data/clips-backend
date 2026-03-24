import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Clip, PostStatus } from './clip.entity';
import { ClipGenerationProcessor, ClipGenerationJob } from './clip-generation.processor';
import { BulkUpdateClipsDto } from './dto/bulk-update-clips.dto';
import { ALL_CLIPS_PROCESSED_EVENT, AllClipsProcessedPayload } from './clips.events';

export type ClipSortField = 'viralityScore' | 'createdAt' | 'duration';
export type SortOrder = 'asc' | 'desc';

export interface ListClipsOptions {
  videoId?: string;
  sortBy?: ClipSortField;
  order?: SortOrder;
}

export interface BulkUpdateResult {
  updatedCount: number;
  /** Summary of the applied changes */
  updates: { selected?: boolean; postStatus?: unknown };
  /** IDs that were not found or did not belong to the user */
  notFoundIds: string[];
  /** True when every clip for the affected video(s) now has postStatus = 'posted' */
  allClipsProcessed: boolean;
}

@Injectable()
export class ClipsService {
  /** In-memory store — replace with Prisma repository when DB is wired up */
  private readonly clips: Clip[] = [];

  constructor(
    private readonly processor: ClipGenerationProcessor,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateClip(job: ClipGenerationJob): Promise<Clip> {
    const clip = await this.processor.process(job);
    // Initialise new fields
    (clip as Clip).selected = false;
    (clip as Clip).postStatus = null;
    (clip as Clip).updatedAt = clip.createdAt;
    this.clips.push(clip);
    return clip;
  }

  /**
   * Bulk update clip status in a single (simulated) transaction.
   *
   * When Prisma is wired up, replace the in-memory mutation block with:
   *
   *   await prisma.$transaction(
   *     validIds.map(id =>
   *       prisma.clip.update({ where: { id }, data: patch })
   *     )
   *   );
   *
   * Ownership check: every requested clipId must exist AND belong to userId.
   * Any ID that fails either check is collected in `notFoundIds` and skipped —
   * the rest of the batch still succeeds (partial update semantics).
   *
   * After the update, if every clip for an affected video has postStatus='posted',
   * an `clips.allProcessed` event is emitted so the Video record can be updated.
   */
  async bulkUpdate(
    userId: string,
    dto: BulkUpdateClipsDto,
  ): Promise<BulkUpdateResult> {
    if (dto.selected === undefined && dto.postStatus === undefined) {
      throw new BadRequestException('At least one of selected or postStatus must be provided');
    }

    // ── Ownership validation ──────────────────────────────────────────────────
    const notFoundIds: string[] = [];
    const validClips: Clip[] = [];

    for (const id of dto.clipIds) {
      const clip = this.clips.find((c) => c.id === id);
      if (!clip) {
        notFoundIds.push(id);
        continue;
      }
      if (clip.userId !== userId) {
        // Treat as not-found to avoid leaking existence of other users' clips
        notFoundIds.push(id);
        continue;
      }
      validClips.push(clip);
    }

    if (validClips.length === 0) {
      throw new ForbiddenException(
        'None of the provided clipIds belong to this user or exist',
      );
    }

    // ── Simulated transaction — atomic in-memory mutation ────────────────────
    const patch: Partial<Pick<Clip, 'selected' | 'postStatus' | 'updatedAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.selected !== undefined) patch.selected = dto.selected;
    if (dto.postStatus !== undefined) patch.postStatus = dto.postStatus as PostStatus;

    for (const clip of validClips) {
      Object.assign(clip, patch);
    }

    // ── Video completion check ────────────────────────────────────────────────
    // Collect distinct videoIds touched by this update
    const affectedVideoIds = [...new Set(validClips.map((c) => c.videoId))];
    let allClipsProcessed = false;

    for (const videoId of affectedVideoIds) {
      const videoClips = this.clips.filter((c) => c.videoId === videoId);
      const allPosted = videoClips.every((c) => c.postStatus === 'posted');

      if (allPosted) {
        allClipsProcessed = true;
        const payload: AllClipsProcessedPayload = {
          videoId,
          clipCount: videoClips.length,
        };
        this.eventEmitter.emit(ALL_CLIPS_PROCESSED_EVENT, payload);
      }
    }

    return {
      updatedCount: validClips.length,
      updates: {
        ...(dto.selected !== undefined && { selected: dto.selected }),
        ...(dto.postStatus !== undefined && { postStatus: dto.postStatus }),
      },
      notFoundIds,
      allClipsProcessed,
    };
  }

  listClips(options: ListClipsOptions = {}): Clip[] {
    const { videoId, sortBy = 'viralityScore', order = 'desc' } = options;

    const result = videoId
      ? this.clips.filter((c) => c.videoId === videoId)
      : [...this.clips];

    return result.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'viralityScore':
          aVal = a.viralityScore ?? -1;
          bVal = b.viralityScore ?? -1;
          break;
        case 'createdAt':
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
        case 'duration':
          aVal = a.endTime - a.startTime;
          bVal = b.endTime - b.startTime;
          break;
        default:
          return 0;
      }

      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  findById(id: string): Clip | undefined {
    return this.clips.find((c) => c.id === id);
  }

  /** Exposed for testing — seed clips directly into the store */
  _seed(clips: Clip[]): void {
    this.clips.push(...clips);
  }
}

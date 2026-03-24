/** Emitted after a bulk update when every clip in a video has postStatus = 'posted' */
export const ALL_CLIPS_PROCESSED_EVENT = 'clips.allProcessed';

export interface AllClipsProcessedPayload {
  videoId: string;
  clipCount: number;
}

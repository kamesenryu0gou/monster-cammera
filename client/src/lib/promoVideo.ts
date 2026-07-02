export type PromoVideoLike = {
  src: string;
  currentTime: number;
  loop: boolean;
  muted: boolean;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
};

export function syncPromoVideoSource(video: PromoVideoLike, assetUrl: string, origin: string) {
  const desiredSrc = new URL(assetUrl, origin).toString();
  if (video.src !== desiredSrc) {
    video.src = desiredSrc;
  }
}

export async function startPromoVideoPlayback(
  video: PromoVideoLike,
  assetUrl: string,
  origin: string,
  restartFromBeginning = false,
) {
  syncPromoVideoSource(video, assetUrl, origin);
  video.loop = true;
  video.muted = false;
  video.volume = 1;
  if (restartFromBeginning) {
    video.currentTime = 0;
  }

  try {
    await video.play();
    return true;
  } catch {
    return false;
  }
}

export function stopPromoVideoPlayback(video: PromoVideoLike, resetToStart = false) {
  video.pause();
  if (resetToStart) {
    video.currentTime = 0;
  }
}

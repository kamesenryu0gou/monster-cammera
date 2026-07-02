import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBoothDeviceId, getDeviceLocalTimeKeys } from "@/lib/boothDeviceId";
import { executeCaptureFlow } from "@/lib/captureFlow";
import { recordCaptureIntentSafely } from "@/lib/captureIntent";
import {
  CAMERA_STAGE_COPY_MAX_WIDTH_CLASS,
  CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION,
  CAMERA_STAGE_START_TEXT_SIZE_CLASS,
  COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS,
  PROCESSING_STAGE_BOTTOM_GAP_PX,
  PROCESSING_STAGE_BOTTOM_PADDING_PX,
  PROCESSING_STAGE_FRAME_FLEX,
  PROCESSING_STAGE_MESSAGE_SIZE_CLASS,
  PROCESSING_STAGE_ROW_GAP_PX,
  PROCESSING_STAGE_TITLE_SIZE_CLASS,
  RESULT_STAGE_BADGE_SIZE_CLASS,
  RESULT_STAGE_CARD_FLEX,
  RESULT_STAGE_GUIDANCE_GAP_PX,
  RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX,
  RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS,
  RESULT_STAGE_ROW_GAP_PX,
} from "@/lib/boothLayout";
import { PORTRAIT_LOGIN_LAYOUT } from "@/lib/portraitLayout";
import { startPromoVideoPlayback, stopPromoVideoPlayback as stopPromoVideoElementPlayback } from "@/lib/promoVideo";
import { SHUTTER_TRIGGER_KEYS, handleGlobalShutterKeydown } from "@/lib/shutterTrigger";
import { Button } from "@/components/ui/button";

type Stage = "login" | "camera" | "processing" | "result" | "error";

type BgmTrackOption = {
  id: string;
  label: string;
  title: string;
  url: string | null;
};

type FloatingSpriteSpec = {
  src: string;
  left: string;
  top: string;
  sizePx: number;
  rotationDeg: number;
  driftXPx: number;
  driftYPx: number;
  durationSeconds: number;
  delaySeconds: number;
  opacity: number;
};

type ResultPayload = {
  jobId: string;
  displayNumber: string;
  formattedReceipt: string;
  status: string;
  generatedImageUrl: string | null;
  printLayoutUrl?: string | null;
  subjectCount: number;
  assignedVariants: Array<{
    subjectIndex: number;
    positionLabel: string;
    variantCode: string;
    variantName: string;
  }>;
};

const COUNTDOWN_SEQUENCE = [3, 2, 1] as const;
const DEFAULT_ERROR_MESSAGE = "処理に失敗しました。もう一度お試しください。";
const DEFAULT_CAMERA_MESSAGE = "";
const FLOATING_MONSTER_IMAGE_URLS = [
  "/manus-storage/15_b84166aa.png",
  "/manus-storage/16_2a08d6a6.png",
  "/manus-storage/17_0a542b34.png",
  "/manus-storage/18_de61f36d.png",
  "/manus-storage/19_04a58a69.png",
  "/manus-storage/20_2a85daec.png",
] as const;
const SPOT_DIFFERENCE_IMAGE_URLS = [
  "/manus-storage/21_b97b5b28.png",
  "/manus-storage/22_99310f69.png",
  "/manus-storage/23_7d5535cf.png",
  "/manus-storage/24_13a1a378.png",
  "/manus-storage/25_5c96f237.png",
] as const;
const CAMERA_PROMO_VIDEO_URL = "/manus-storage/chinju_camera_3_c3e3d1cb.mp4";
const A5_PRINT_WIDTH = 1748;
const A5_PRINT_HEIGHT = 2480;
const A5_PRINT_COLUMNS = 2;
const A5_PRINT_ROWS = 4;
const A5_PRINT_MARGIN_X = 112;
const A5_PRINT_MARGIN_Y = 120;
const A5_PRINT_GAP_X = 56;
const A5_PRINT_GAP_Y = 42;
const FALLBACK_BGM_TRACKS: BgmTrackOption[] = [
  { id: "off", label: "OFF", title: "BGMなし", url: null },
  { id: "bgm1", label: "BGM1", title: "Moonlit Monster Parade", url: null },
  { id: "bgm2", label: "BGM2", title: "Mossy Moon Arcade", url: null },
  { id: "bgm3", label: "BGM3", title: "Pixel Dragon Parade", url: null },
  { id: "bgm4", label: "BGM4", title: "Treasure Sprout Run", url: null },
];

function countdownFontSize(value: number | null) {
  if (value === 3) return 132;
  if (value === 2) return 180;
  if (value === 1) return 236;
  return 0;
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function isMediaPlaybackInterruptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("interrupted by a new load request") || message.includes("The play() request was interrupted") || message.includes("AbortError");
}

function pickRandomSpotDifferenceImage() {
  return SPOT_DIFFERENCE_IMAGE_URLS[Math.floor(Math.random() * SPOT_DIFFERENCE_IMAGE_URLS.length)] ?? SPOT_DIFFERENCE_IMAGE_URLS[0];
}

function buildDownloadProxyUrl(assetUrl: string | null | undefined, filename: string) {
  if (!assetUrl?.startsWith("/manus-storage/")) {
    return null;
  }

  const key = assetUrl.replace(/^\/manus-storage\//, "");
  return `/api/download-storage/${key}?filename=${encodeURIComponent(filename)}`;
}

function splitReceiptNumber(value: string | null | undefined) {
  const normalized = value ?? "";
  const match = normalized.match(/^(.*?)(\d{4})$/);
  if (!match) {
    return { prefix: normalized, lastFour: "----" };
  }
  return {
    prefix: match[1],
    lastFour: match[2],
  };
}

function loadImageFromObjectUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = url;
  });
}

async function buildPrintLayoutBlob(fetchUrl: string) {
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error("PRINT_LAYOUT_FETCH_FAILED");
  }

  const sourceBlob = await response.blob();
  const sourceObjectUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = await loadImageFromObjectUrl(sourceObjectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = A5_PRINT_WIDTH;
    canvas.height = A5_PRINT_HEIGHT;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("PRINT_LAYOUT_CANVAS_UNAVAILABLE");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const usableWidth = A5_PRINT_WIDTH - A5_PRINT_MARGIN_X * 2 - A5_PRINT_GAP_X * (A5_PRINT_COLUMNS - 1);
    const usableHeight = A5_PRINT_HEIGHT - A5_PRINT_MARGIN_Y * 2 - A5_PRINT_GAP_Y * (A5_PRINT_ROWS - 1);
    const tileSize = Math.floor(Math.min(usableWidth / A5_PRINT_COLUMNS, usableHeight / A5_PRINT_ROWS));
    const totalGridWidth = tileSize * A5_PRINT_COLUMNS + A5_PRINT_GAP_X * (A5_PRINT_COLUMNS - 1);
    const totalGridHeight = tileSize * A5_PRINT_ROWS + A5_PRINT_GAP_Y * (A5_PRINT_ROWS - 1);
    const offsetX = Math.floor((A5_PRINT_WIDTH - totalGridWidth) / 2);
    const offsetY = Math.floor((A5_PRINT_HEIGHT - totalGridHeight) / 2);

    for (let index = 0; index < A5_PRINT_COLUMNS * A5_PRINT_ROWS; index += 1) {
      const column = index % A5_PRINT_COLUMNS;
      const row = Math.floor(index / A5_PRINT_COLUMNS);
      const x = offsetX + column * (tileSize + A5_PRINT_GAP_X);
      const y = offsetY + row * (tileSize + A5_PRINT_GAP_Y);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#ececec";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - 10, y - 10, tileSize + 20, tileSize + 20, 28);
      ctx.fill();
      ctx.stroke();
      ctx.drawImage(image, x, y, tileSize, tileSize);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => {
        if (!result) {
          reject(new Error("PRINT_LAYOUT_TO_BLOB_FAILED"));
          return;
        }
        resolve(result);
      }, "image/png");
    });

    return blob;
  } finally {
    URL.revokeObjectURL(sourceObjectUrl);
  }
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: config } = trpc.signage.getConfig.useQuery();
  const unlockMutation = trpc.signage.unlock.useMutation();
  const trackCaptureMutation = trpc.signage.trackCaptureIntent.useMutation();
  const prepareCaptureMutation = trpc.signage.prepareCapture.useMutation();
  const processCaptureMutation = trpc.signage.processCapture.useMutation();

  const [stage, setStage] = useState<Stage>("login");
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState(DEFAULT_CAMERA_MESSAGE);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingReceipt, setProcessingReceipt] = useState("");
  const [resultPayload, setResultPayload] = useState<ResultPayload | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const [printPreviewFilename, setPrintPreviewFilename] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedBgmTrackId, setSelectedBgmTrackId] = useState("off");
  const [processingPuzzleUrl, setProcessingPuzzleUrl] = useState<string>(SPOT_DIFFERENCE_IMAGE_URLS[0]);
  const [promoVideoNeedsTap, setPromoVideoNeedsTap] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const promoVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoReturnTimerRef = useRef<number | null>(null);
  const errorReturnTimerRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const downloadedJobRef = useRef<string | null>(null);
  const printPreviewObjectUrlRef = useRef<string | null>(null);

  const resultAutoReturnMs = config?.resultAutoReturnMs ?? 13000;
  const availableBgmTracks = useMemo(() => config?.bgmTracks ?? FALLBACK_BGM_TRACKS, [config?.bgmTracks]);
  const defaultBgmTrackId = config?.defaultBgmTrackId ?? "off";
  const selectedBgmTrack =
    availableBgmTracks.find(track => track.id === selectedBgmTrackId) ??
    availableBgmTracks.find(track => track.id === defaultBgmTrackId) ??
    FALLBACK_BGM_TRACKS[0];
  const deviceId = useMemo(() => getBoothDeviceId(), []);
  const floatingSprites = useMemo<FloatingSpriteSpec[]>(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const src = FLOATING_MONSTER_IMAGE_URLS[index % FLOATING_MONSTER_IMAGE_URLS.length];
      const left = 6 + Math.random() * 88;
      const top = 76 + Math.random() * 20;
      const sizePx = 182 + Math.round(Math.random() * 126);
      const rotationDeg = -28 + Math.round(Math.random() * 56);
      const driftXPx = -62 + Math.round(Math.random() * 124);
      const driftYPx = -220 - Math.round(Math.random() * 180);
      const durationSeconds = 13.5 + Math.random() * 5.5;
      const delaySeconds = -(index * 1.05 + Math.random() * 3.2);
      const opacity = 0.28 + Math.random() * 0.2;

      return {
        src,
        left: `${left}%`,
        top: `${top}%`,
        sizePx,
        rotationDeg,
        driftXPx,
        driftYPx,
        durationSeconds,
        delaySeconds,
        opacity,
      } satisfies FloatingSpriteSpec;
    });
  }, []);

  useEffect(() => {
    setSelectedBgmTrackId(currentTrackId => {
      if (availableBgmTracks.some(track => track.id === currentTrackId)) {
        return currentTrackId;
      }
      return defaultBgmTrackId;
    });
  }, [availableBgmTracks, defaultBgmTrackId]);

  const restoreCameraPreview = () => {
    window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;
      video.srcObject = streamRef.current;
      video
        .play()
        .then(() => {
          setCameraReady(true);
        })
        .catch(() => {
          setCameraReady(false);
        });
    });
  };

  const revokePrintPreview = () => {
    if (printPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(printPreviewObjectUrlRef.current);
      printPreviewObjectUrlRef.current = null;
    }
    setPrintPreviewUrl(null);
    setPrintPreviewFilename(null);
  };

  const syncBgmPlayback = (trackId = selectedBgmTrackId) => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = availableBgmTracks.find(item => item.id === trackId) ?? null;
    if (!track?.url) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const desiredSrc = new URL(track.url, window.location.origin).toString();
    if (audio.src !== desiredSrc) {
      audio.src = desiredSrc;
    }

    audio.loop = true;
    audio.volume = 0.45;
    audio.play().catch(error => {
      if (!isMediaPlaybackInterruptionError(error)) {
        console.error(error);
      }
    });
  };

  const stopPromoVideoPlayback = (resetToStart = false) => {
    const promoVideo = promoVideoRef.current;
    if (!promoVideo) return;
    stopPromoVideoElementPlayback(promoVideo, resetToStart);
  };

  const syncPromoVideoPlayback = async (restartFromBeginning = false) => {
    const promoVideo = promoVideoRef.current;
    if (!promoVideo) return;
    const played = await startPromoVideoPlayback(promoVideo, CAMERA_PROMO_VIDEO_URL, window.location.origin, restartFromBeginning);
    setPromoVideoNeedsTap(!played);
  };

  const resumeCameraStage = () => {
    setResultPayload(null);
    setProcessingReceipt("");
    setErrorMessage("");
    setStatusMessage(DEFAULT_CAMERA_MESSAGE);
    setPromoVideoNeedsTap(false);
    setStage("camera");
    restoreCameraPreview();
  };

  const getCaptureErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : DEFAULT_ERROR_MESSAGE;
    if (message.includes("usage exhausted")) {
      return "AI加工の利用上限に達しています。少し時間を空けてから再撮影してください。";
    }
    return message;
  };

  useEffect(() => {
    syncBgmPlayback(selectedBgmTrackId);
  }, [availableBgmTracks, selectedBgmTrackId, stage]);

  useEffect(() => {
    if (stage === "camera") {
      void syncPromoVideoPlayback(true);
      return;
    }

    setPromoVideoNeedsTap(false);
    stopPromoVideoPlayback(true);
  }, [stage]);

  useEffect(() => {
    let cancelled = false;

    if (stage === "camera" && streamRef.current) {
      restoreCameraPreview();
      return () => {
        cancelled = true;
      };
    }

    async function startCamera() {
      if (streamRef.current || !(stage === "camera" || stage === "processing" || stage === "result" || stage === "error")) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraError("");
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          setCameraReady(true);
        }
      } catch (error) {
        console.error(error);
        setCameraReady(false);
        setCameraError("カメラを開始できませんでした。ブラウザのカメラ利用を許可してください。");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      if (autoReturnTimerRef.current) {
        window.clearTimeout(autoReturnTimerRef.current);
      }
      if (errorReturnTimerRef.current) {
        window.clearTimeout(errorReturnTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (promoVideoRef.current) {
        promoVideoRef.current.pause();
      }
      revokePrintPreview();
    };
  }, []);

  useEffect(() => {
    if (stage !== "result") return;

    autoReturnTimerRef.current = window.setTimeout(() => {
      resumeCameraStage();
    }, resultAutoReturnMs);

    return () => {
      if (autoReturnTimerRef.current) {
        window.clearTimeout(autoReturnTimerRef.current);
      }
    };
  }, [stage, resultAutoReturnMs]);

  useEffect(() => {
    if (stage !== "error") return;

    errorReturnTimerRef.current = window.setTimeout(() => {
      resumeCameraStage();
    }, 5000);

    return () => {
      if (errorReturnTimerRef.current) {
        window.clearTimeout(errorReturnTimerRef.current);
      }
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "result" || !resultPayload?.generatedImageUrl) {
      revokePrintPreview();
      return;
    }

    let active = true;
    const fileBase = resultPayload.formattedReceipt || resultPayload.jobId;
    const proxyUrl = buildDownloadProxyUrl(resultPayload.generatedImageUrl, `${fileBase}-generated.png`);

    if (!proxyUrl) {
      revokePrintPreview();
      return;
    }

    buildPrintLayoutBlob(proxyUrl)
      .then(blob => {
        if (!active) return;
        revokePrintPreview();
        const objectUrl = URL.createObjectURL(blob);
        printPreviewObjectUrlRef.current = objectUrl;
        setPrintPreviewUrl(objectUrl);
        setPrintPreviewFilename(`${fileBase}-a5-print-layout.png`);
      })
      .catch(error => {
        console.error(error);
        if (!active) return;
        revokePrintPreview();
      });

    return () => {
      active = false;
    };
  }, [stage, resultPayload?.jobId, resultPayload?.generatedImageUrl]);

  useEffect(() => {
    if (stage !== "result" || !resultPayload || !printPreviewUrl || downloadedJobRef.current === resultPayload.jobId) {
      return;
    }

    downloadedJobRef.current = resultPayload.jobId;
    const timer = window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = printPreviewUrl;
      link.download = printPreviewFilename ?? `${resultPayload.formattedReceipt || resultPayload.jobId}-a5-print-layout.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [stage, resultPayload, printPreviewUrl, printPreviewFilename]);

  const captureSquareImage = () => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("VIDEO_NOT_READY");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const squareSize = Math.min(sourceWidth, sourceHeight);
    const sx = Math.max((sourceWidth - squareSize) / 2, 0);
    const sy = Math.max((sourceHeight - squareSize) / 2, 0);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("CANVAS_NOT_AVAILABLE");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, squareSize, squareSize, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL("image/png");
  };

  const startCaptureFlow = async () => {
    if (selectedBgmTrack.url) {
      syncBgmPlayback(selectedBgmTrackId);
    }
    if (stage !== "camera" || isCapturingRef.current || !cameraReady) return;
    setPromoVideoNeedsTap(false);
    stopPromoVideoPlayback(true);
    if (!videoRef.current?.videoWidth) {
      setErrorMessage("カメラ映像の準備が整っていません。少し待ってからもう一度お試しください。");
      setStage("error");
      return;
    }

    isCapturingRef.current = true;

    try {
      const timeKeys = getDeviceLocalTimeKeys();
      await executeCaptureFlow({
        recordCaptureIntent: async () => {
          await recordCaptureIntentSafely(trackCaptureMutation, { deviceId, timeKeys });
        },
        countdownSequence: COUNTDOWN_SEQUENCE,
        wait,
        onCountdownChange: setCountdownValue,
        captureSquareImage,
        prepareCapture: () => prepareCaptureMutation.mutateAsync(),
        onProcessingStart: prepared => {
          setProcessingReceipt(prepared.formattedReceipt);
          setProcessingPuzzleUrl(pickRandomSpotDifferenceImage());
          setStage("processing");
          setStatusMessage("AI加工中です");
        },
        processCapture: payload => processCaptureMutation.mutateAsync(payload),
        onResult: result => {
          const normalizedResult: ResultPayload = {
            ...(result as ResultPayload),
            generatedImageUrl: result.generatedImageUrl ?? null,
            printLayoutUrl: result.printLayoutUrl ?? null,
          };
          setResultPayload(normalizedResult);
          setStage("result");
        },
        onError: error => {
          setErrorMessage(getCaptureErrorMessage(error));
          setStage("error");
        },
      });
    } finally {
      isCapturingRef.current = false;
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");

    if (!passwordInput.trim()) {
      setLoginError("パスワードを入力してください。");
      return;
    }

    try {
      await unlockMutation.mutateAsync({ password: passwordInput });
      setPasswordInput("");
      setStatusMessage(DEFAULT_CAMERA_MESSAGE);
      setStage("camera");
      if (selectedBgmTrack.url) {
        window.setTimeout(() => {
          syncBgmPlayback(selectedBgmTrackId);
        }, 0);
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : typeof error === "string" ? error : "パスワードが正しくありません。";
      setLoginError(message);
    }
  };

  const handleBgmTrackSelect = (trackId: string) => {
    setSelectedBgmTrackId(trackId);
    syncBgmPlayback(trackId);
  };

  const handleCameraSquareMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (stage !== "camera" || event.button !== 0) return;
    startCaptureFlow();
  };

  useEffect(() => {
    if (stage !== "camera") return;

    const handleGlobalMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      startCaptureFlow();
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleGlobalShutterKeydown(event, () => {
        startCaptureFlow();
      });
    };

    window.addEventListener("mousedown", handleGlobalMouseDown);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleGlobalMouseDown);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [cameraReady, selectedBgmTrack.url, selectedBgmTrackId, stage]);

  const renderFloatingBackdrop = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.14),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#fff8fb_54%,_#ffffff_100%)]" />
      {floatingSprites.map((sprite, index) => {
        const spriteStyle: CSSProperties & Record<string, string | number> = {
          left: sprite.left,
          top: sprite.top,
          width: `${sprite.sizePx}px`,
          opacity: sprite.opacity,
          transform: `translate(-50%, -50%) rotate(${sprite.rotationDeg}deg)`,
          animationDuration: `${sprite.durationSeconds}s`,
          animationDelay: `${sprite.delaySeconds}s`,
          "--float-x": `${sprite.driftXPx}px`,
          "--float-y": `${sprite.driftYPx}px`,
          "--float-rotate": `${sprite.rotationDeg + (sprite.rotationDeg >= 0 ? 10 : -10)}deg`,
        };

        return <img key={`${sprite.src}-${index}`} src={sprite.src} alt="" aria-hidden="true" className="floating-monster-sprite absolute object-contain" style={spriteStyle} />;
      })}
    </div>
  );

  const renderCameraSquare = (
    overlayContent?: ReactNode,
    maxWidth = "min(92vw, calc(100svh - 18rem), 860px)",
  ) => (
    <div
      onMouseDown={handleCameraSquareMouseDown}
      style={{ maxWidth }}
      className="relative mx-auto aspect-square w-full overflow-hidden rounded-[2.2rem] border-[8px] border-[#ffd84d] bg-[#ffd84d] shadow-[0_24px_52px_rgba(255,216,77,0.3)]"
    >
      <video ref={videoRef} playsInline muted autoPlay className="h-full w-full scale-x-[-1] object-cover" />
      {countdownValue !== null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle,_rgba(255,255,255,0.06),_rgba(15,23,42,0.52))]">
          <div className="countdown-pop select-none font-black leading-none text-white drop-shadow-[0_10px_24px_rgba(15,23,42,0.45)]" style={{ fontSize: `${countdownFontSize(countdownValue)}px` }}>
            {countdownValue}
          </div>
        </div>
      ) : null}
      {overlayContent}
    </div>
  );

  const renderReceiptGuidance = (receipt: string | null | undefined, accent: "gold" | "red" = "red", compact = false) => {
    const { prefix, lastFour } = splitReceiptNumber(receipt);
    const accentClass = accent === "gold" ? "text-[#c48700]" : "text-[#e11d48]";

    if (compact) {
      return (
        <div className="flex items-center gap-4 rounded-[1.55rem] border-2 border-[#d4dbe5] bg-white px-5 py-3 text-left shadow-[0_12px_26px_rgba(148,163,184,0.18)]">
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-black tracking-[0.18em] text-slate-500 sm:text-sm">受付番号</span>
            <span className="text-base font-bold tracking-[0.14em] text-slate-700 sm:text-lg">{prefix}</span>
          </div>
          <span className={`${COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS} font-black leading-none tracking-[0.12em] ${accentClass}`}>{lastFour}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 rounded-[1.8rem] border border-[#d4dbe5] bg-white px-5 py-5 text-center shadow-[0_16px_34px_rgba(148,163,184,0.18)]">
        <p className="text-sm font-black tracking-[0.18em] text-slate-500">受付番号</p>
        <p className="text-lg font-bold tracking-[0.12em] text-slate-700">{prefix}</p>
        <p className={`text-6xl font-black tracking-[0.22em] sm:text-7xl ${accentClass}`}>{lastFour}</p>
        <p className="text-base font-black leading-7 text-slate-800 sm:text-lg">この4桁をスタッフへお伝えください</p>
      </div>
    );
  };

  const renderLoginStage = () => (
    <section className="relative z-10 flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
        <div
          className="mx-auto flex max-h-[calc(100svh-6.75rem)] w-full max-w-[min(92vw,680px)] flex-col gap-2 overflow-hidden rounded-[1.65rem] border border-[#d9e0ea] bg-white/96 px-4 py-3 shadow-[0_22px_60px_rgba(148,163,184,0.22)] sm:px-4 sm:py-4"
          style={{ maxHeight: `min(calc(100svh - 6.75rem), ${PORTRAIT_LOGIN_LAYOUT.cardMaxHeightPx}px)` }}
        >
          <div className="space-y-1 text-center">
            <p className="text-[clamp(1rem,2vw,1.28rem)] font-black tracking-[0.12em] text-slate-900">ログインして撮影開始</p>
            <p className="mx-auto max-w-xl text-[11px] font-semibold leading-4 text-slate-600 sm:text-xs sm:leading-5">
              パスワードを入力し、再生したいBGMを選んだら、パスワードを入れてログインしてください。
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="grid min-h-0 gap-2 md:grid-cols-[minmax(0,0.9fr)_minmax(210px,0.78fr)] md:items-stretch">
            <div className="w-full rounded-[1.3rem] border border-[#d9e0ea] bg-[#ffffff] px-3 py-2.5 shadow-[0_14px_30px_rgba(148,163,184,0.16)] md:max-w-[328px] md:justify-self-end sm:px-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black tracking-[0.14em] text-slate-900 sm:text-xs">BGM SELECT</p>
                  <p className="text-[10px] font-semibold leading-4 text-slate-500 sm:text-[11px]">選択するとログイン前でも試聴できます</p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-900 px-2 py-0.5 text-[10px] font-black tracking-[0.14em] text-white/88 sm:text-[11px]">
                  {selectedBgmTrack.label}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {availableBgmTracks.map(track => {
                  const isSelected = selectedBgmTrackId === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleBgmTrackSelect(track.id)}
                      className={`flex min-h-[48px] items-center justify-center rounded-[0.95rem] border px-2 py-1.5 text-center text-[13px] font-black tracking-[0.14em] shadow-[0_10px_22px_rgba(148,163,184,0.16)] transition-colors sm:min-h-[50px] sm:text-sm ${
                        isSelected
                          ? "border-[#f59e0b] bg-[linear-gradient(180deg,#ffb95c_0%,#ff8a00_100%)] text-white"
                          : "border-[#d9e0ea] bg-[#f8fafc] text-slate-700 hover:bg-[#eef2f7]"
                      }`}
                    >
                      {track.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.3rem] border border-[#d9e0ea] bg-[#ffffff] px-3.5 py-2.5 shadow-[0_14px_30px_rgba(148,163,184,0.16)] sm:px-3.5">
              <div className="space-y-2.5">
                <label htmlFor="signage-password" className="text-[11px] font-black tracking-[0.14em] text-slate-900 sm:text-xs">
                  PASSWORD
                </label>
                <input
                  id="signage-password"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={event => {
                    const digitsOnly = event.target.value.normalize("NFKC").replace(/[^\d]/g, "").slice(0, 5);
                    setPasswordInput(digitsOnly);
                    if (loginError) {
                      setLoginError("");
                    }
                  }}
                  maxLength={5}
                  className="h-11 w-full rounded-[1rem] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-base font-black tracking-[0.26em] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f59e0b] sm:h-12 sm:text-lg"
                  placeholder="•••••"
                />
                {loginError ? (
                    <div className="rounded-[0.95rem] border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[11px] font-bold leading-4 text-[#be123c] sm:text-xs sm:leading-5">

                    {loginError}
                  </div>
                ) : (
                    <div className="rounded-[0.95rem] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-[10px] font-semibold leading-4 text-slate-600 sm:text-[11px] sm:leading-4">

                    楽曲選択後にログインすると、その設定のまま撮影画面へ進みます。
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={unlockMutation.isPending || !config}
                className="mt-2 h-11 rounded-[1.1rem] border border-[#0f172a] bg-[linear-gradient(180deg,#facc15_0%,#f59e0b_100%)] text-sm font-black tracking-[0.12em] text-[#3f2200] shadow-[0_12px_26px_rgba(245,158,11,0.26)] hover:bg-[linear-gradient(180deg,#fde047_0%,#fbbf24_100%)] disabled:opacity-60 sm:h-12 sm:text-[15px]"
              >
                {unlockMutation.isPending ? "ログイン中..." : "ログインして開始"}
              </Button>
            </div>
          </form>

        </div>

        <div className="w-full max-w-[min(68vw,292px)] text-center">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-slate-500 sm:text-[11px]">管理者の方はこちら</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem("signage-admin-unlocked");
              }
              setLocation("/admin");
            }}
            className="mt-1.5 h-9 w-full rounded-[0.95rem] border border-[#cbd5e1] bg-white/95 px-4 text-[12px] font-black tracking-[0.1em] text-slate-700 shadow-[0_10px_22px_rgba(148,163,184,0.14)] hover:bg-slate-50 sm:h-10 sm:text-[13px]"
          >
            管理者メニュー
          </Button>
        </div>
      </div>
    </section>
  );

  const renderCameraStage = () => (
    <section className="relative z-10 flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[min(92vw,700px)] flex-[0.28] items-end justify-center pb-3">
          <div
            onMouseDown={event => event.stopPropagation()}
            className="relative flex h-full min-h-[108px] w-full max-w-[min(86vw,640px)] items-center overflow-hidden rounded-[1.5rem] border border-[#d9e0ea] bg-white/92 shadow-[0_18px_40px_rgba(148,163,184,0.2)]"
          >
            <video
              ref={promoVideoRef}
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            />
            {promoVideoNeedsTap ? (
              <button
                type="button"
                data-shutter-ignore="true"
                onMouseDown={event => event.stopPropagation()}
                onClick={() => {
                  void syncPromoVideoPlayback(true);
                }}
                className="absolute inset-x-3 bottom-3 rounded-full border border-[#0f172a] bg-white/92 px-4 py-2 text-xs font-black tracking-[0.08em] text-slate-800 shadow-[0_12px_24px_rgba(15,23,42,0.18)] sm:text-sm"
              >
                動画と音声を再生する
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-[0.72] flex-col items-center justify-start gap-1.5 pt-1 pb-1">
          {renderCameraSquare(undefined, CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION)}
          <div className={`mx-auto flex w-full ${CAMERA_STAGE_COPY_MAX_WIDTH_CLASS} shrink-0 flex-col items-center gap-1 text-center`}>
            <p className={`start-copy-pop ${CAMERA_STAGE_START_TEXT_SIZE_CLASS} font-black leading-[0.9] tracking-[-0.03em] text-[#ef4444] [font-family:'Arial_Rounded_MT_Bold','Hiragino_Maru_Gothic_ProN','Meiryo',sans-serif] [text-shadow:0_4px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(239,68,68,0.22)]`}>
              ボタンを押して
              <br />
              撮影開始！
            </p>
            {cameraError ? (
              <p className="rounded-full border border-[#fecaca] bg-[#fff1f2] px-5 py-2 text-sm font-bold text-[#be123c] shadow-[0_10px_22px_rgba(244,63,94,0.14)] sm:text-base">
                {cameraError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderProcessingStage = () => (
    <section className="relative z-10 flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5">
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-between"
        style={{ rowGap: `${PROCESSING_STAGE_ROW_GAP_PX}px`, paddingTop: "6px", paddingBottom: "6px" }}
      >
        <div className="flex shrink-0 flex-col items-center gap-1 pt-1 text-center">
          <h2 className={`${PROCESSING_STAGE_TITLE_SIZE_CLASS} font-black tracking-[0.14em] text-slate-900`}>AI加工中</h2>
          <div className="flex items-center gap-2 text-[#f59e0b]">
            {[0, 1, 2].map(index => (
              <span key={index} className="processing-dot h-3 w-3 rounded-full bg-current" style={{ animationDelay: `${index * 0.18}s` }} />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 w-full items-center justify-center" style={{ flex: PROCESSING_STAGE_FRAME_FLEX }}>
          {renderCameraSquare(
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white p-3 sm:p-4">
              <img
                src={processingPuzzleUrl}
                alt="珍獣の間違い探し"
                className="h-full w-full rounded-[1.5rem] object-contain"
              />
            </div>,
            "min(88vw, calc(100svh - 18rem), 760px)",
          )}
        </div>

        <div
          className="flex shrink-0 flex-col items-center text-center"
          style={{ gap: `${PROCESSING_STAGE_BOTTOM_GAP_PX}px`, paddingBottom: `${PROCESSING_STAGE_BOTTOM_PADDING_PX}px` }}
        >
          <p className={`max-w-[42rem] whitespace-pre-line ${PROCESSING_STAGE_MESSAGE_SIZE_CLASS} font-black leading-[1.32] text-slate-700 sm:leading-[1.38]`}>
            {"不思議な世界を探索中・・・\nあなただけの珍獣は見つかるかな？\nもう少し待ってみよう！"}
          </p>
          {renderReceiptGuidance(processingReceipt, "gold", true)}
        </div>
      </div>
    </section>
  );

  const renderResultStage = () => (
    <section className="relative z-10 flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5">
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center"
        style={{ rowGap: `${RESULT_STAGE_ROW_GAP_PX}px`, paddingTop: "6px", paddingBottom: "6px" }}
      >
        <div className={`rounded-full border border-[#f59e0b] bg-[linear-gradient(180deg,#fde68a_0%,#fbbf24_100%)] px-7 py-1.5 text-center ${RESULT_STAGE_BADGE_SIZE_CLASS} font-black tracking-[0.14em] text-[#4a2a00] shadow-[0_12px_24px_rgba(245,158,11,0.18)]`}>
          撮影完了！
        </div>
        <div
          className="flex min-h-0 w-full max-w-[min(92vw,700px)] flex-col overflow-hidden rounded-[1.7rem] border border-[#d9e0ea] bg-white p-2.5 shadow-[0_20px_48px_rgba(148,163,184,0.22)] sm:p-3.5"
          style={{ flex: RESULT_STAGE_CARD_FLEX }}
        >
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            {printPreviewUrl ? (
              <img src={printPreviewUrl} alt="A5 8-up print preview" className="max-h-full w-auto max-w-full object-contain" />
            ) : resultPayload?.generatedImageUrl ? (
              <img src={resultPayload.generatedImageUrl} alt="generated monster result" className="max-h-full w-auto max-w-full object-contain" />
            ) : (
              <div className="aspect-[148/210] h-full max-h-full w-auto max-w-full bg-slate-100" />
            )}
          </div>
          <div
            className="flex shrink-0 flex-col items-center rounded-[1.3rem] border-2 border-[#f59e0b] bg-[linear-gradient(180deg,#fff7d6_0%,#ffe7a3_100%)] px-3 py-2.5 text-center shadow-[0_16px_32px_rgba(245,158,11,0.18)] sm:px-4"
            style={{ marginTop: `${RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX}px`, gap: `${RESULT_STAGE_GUIDANCE_GAP_PX}px` }}
          >
            {renderReceiptGuidance(resultPayload?.formattedReceipt, "red", true)}
            <p className={`rounded-[1rem] bg-[#fffaf0] px-4 py-2 ${RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS} font-black leading-tight text-[#7c2d12] shadow-[0_10px_20px_rgba(255,255,255,0.5)]`}>受け取りは店内スタッフに受付番号をお伝えください。</p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderErrorStage = () => (
    <section className="relative z-10 flex h-[100svh] min-h-[100svh] flex-col justify-between overflow-hidden px-3 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-1 items-center justify-center py-1.5">
        <div className="mx-auto flex w-full max-w-[min(92vw,620px)] flex-col items-center gap-4 rounded-[1.7rem] border border-[#fecaca] bg-white px-5 py-6 text-center shadow-[0_18px_44px_rgba(244,63,94,0.12)]">
          <div className="rounded-full border border-[#fb7185] bg-[#fff1f2] px-4 py-1.5 text-xs font-black tracking-[0.18em] text-[#be123c] sm:text-sm">RETRY</div>
          <h2 className="text-2xl font-black tracking-[0.12em] text-slate-900 sm:text-3xl">再撮影をお願いします</h2>
          <p className="text-sm font-semibold leading-6 text-slate-600 sm:text-base sm:leading-7">{errorMessage || cameraError || DEFAULT_ERROR_MESSAGE}</p>
          <Button onClick={resumeCameraStage} className="h-12 rounded-[1.25rem] border border-[#0f172a] bg-[linear-gradient(180deg,#facc15_0%,#f59e0b_100%)] px-7 text-base font-black text-[#3f2200] shadow-[0_12px_24px_rgba(245,158,11,0.2)] hover:bg-[linear-gradient(180deg,#fde047_0%,#fbbf24_100%)] sm:h-14 sm:text-lg">
            撮影画面へ戻る
          </Button>
        </div>
      </div>
      <div className="pb-1 text-center text-xs font-semibold text-slate-400 sm:text-sm">数秒後に自動で撮影画面へ戻ります。</div>
    </section>
  );

  return (
    <div className="relative h-[100svh] min-h-[100svh] w-screen overflow-hidden bg-white text-foreground">
      {renderFloatingBackdrop()}
      <audio ref={audioRef} preload="auto" />
      {stage === "login" && renderLoginStage()}
      {stage === "camera" && renderCameraStage()}
      {stage === "processing" && renderProcessingStage()}
      {stage === "result" && renderResultStage()}
      {stage === "error" && renderErrorStage()}
    </div>
  );
}

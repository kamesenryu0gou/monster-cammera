import { COMMON_PROMPT, PROMPT_CODES, PROMPT_VARIANTS, type PromptVariantCode } from "@shared/boothPrompts";

export const SIGNAGE_TITLE = "珍獣カメラ";
export const SIGNAGE_SUBTITLE = "AIフォト体験";
export const MONTHLY_PASSWORDS = {
  1: "58429",
  2: "03716",
  3: "96204",
  4: "41875",
  5: "79031",
  6: "24698",
  7: "83540",
  8: "10963",
  9: "67482",
  10: "32157",
  11: "90846",
  12: "45270",
} as const;

export const RESULT_AUTO_RETURN_MS = 13000;
export const MAX_SUBJECTS = 5;

export type BgmTrackId = "off" | "bgm1" | "bgm2" | "bgm3" | "bgm4";

export type BgmTrackOption = {
  id: BgmTrackId;
  label: string;
  title: string;
  url: string | null;
};

export const DEFAULT_BGM_TRACK_ID: BgmTrackId = "off";

export const BGM_TRACKS: BgmTrackOption[] = [
  {
    id: "off",
    label: "OFF",
    title: "BGMなし",
    url: null,
  },
  {
    id: "bgm1",
    label: "BGM1",
    title: "Moonlit Monster Parade",
    url: "/manus-storage/MoonlitMonsterParade_6efd7022.mp3",
  },
  {
    id: "bgm2",
    label: "BGM2",
    title: "Mossy Moon Arcade",
    url: "/manus-storage/MossyMoonArcade_28c5208c.mp3",
  },
  {
    id: "bgm3",
    label: "BGM3",
    title: "Pixel Dragon Parade",
    url: "/manus-storage/PixelDragonParade_58be3438.mp3",
  },
  {
    id: "bgm4",
    label: "BGM4",
    title: "Treasure Sprout Run",
    url: "/manus-storage/TreasureSproutRun_b882baa0.mp3",
  },
];

const A5_PRINT_WIDTH = 1748;
const A5_PRINT_HEIGHT = 2480;
const A5_PRINT_COLUMNS = 2;
const A5_PRINT_ROWS = 4;
const A5_PRINT_MARGIN_X = 112;
const A5_PRINT_MARGIN_Y = 120;
const A5_PRINT_GAP_X = 56;
const A5_PRINT_GAP_Y = 42;

export type DetectedSubject = {
  subjectIndex: number;
  positionLabel: string;
  appearanceSummary: string;
};

export type AssignedSubjectVariant = DetectedSubject & {
  variantCode: PromptVariantCode;
  variantName: string;
  variantPrompt: string;
};

export function padDisplayNumber(sequenceNumber: number) {
  return String(sequenceNumber).padStart(4, "0");
}

export function getTokyoMonth(date = new Date()) {
  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
  }).format(date);
  const month = Number(monthLabel.replace(/\D/g, ""));
  return month as keyof typeof MONTHLY_PASSWORDS;
}

export function getMonthlyPassword(date = new Date()) {
  return MONTHLY_PASSWORDS[getTokyoMonth(date)];
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
  }
  return copy;
}

export function assignUniqueVariants(subjects: DetectedSubject[]) {
  const shuffledCodes = shuffle(PROMPT_CODES);
  return subjects.map((subject, index) => {
    const variantCode = shuffledCodes[index] as PromptVariantCode;
    const variant = PROMPT_VARIANTS[variantCode];
    return {
      ...subject,
      variantCode,
      variantName: variant.name,
      variantPrompt: variant.prompt,
    } satisfies AssignedSubjectVariant;
  });
}

export function buildTransformationPrompt(subjects: AssignedSubjectVariant[]) {
  const subjectInstructions = subjects
    .map(
      subject => `Subject ${subject.subjectIndex} (${subject.positionLabel}; ${subject.appearanceSummary}) must use the ${subject.variantName} variant. Variant instructions: ${subject.variantPrompt}`,
    )
    .join("\n");

  return [
    "Create one finished transformed image from the provided photo.",
    COMMON_PROMPT,
    "Prioritize a complete creature redesign with strong chibi monster silhouette over realistic human anatomy or costume-like accessories.",
    "Visible skin must read as monster skin, fur, plush, scales, bark, fantasy hide, or other non-human material instead of ordinary human skin tone.",
    "If original human skin tone appears anywhere, convert it into the selected creature palette and surface texture rather than leaving realistic human skin.",
    "Do not keep realistic human nose bridge, lips, jawline, cheekbones, fingers, or human-length limbs as the dominant read.",
    "Favor creature paws, claws, mascot mitts, compact legs, muzzle-like facial simplification, and rounded monster body balance over a stylized human portrait.",
    "Apply a unique variant to each detected subject without duplication.",
    "Preserve the whole group composition and camera angle in a single shared scene.",
    "Generate one newly imagined background for the whole group so it feels like a cohesive monster world rather than the original location.",
    subjectInstructions,
  ].join("\n\n");
}

export function buildA5PrintLayoutSvg(imageDataUrl: string) {
  const usableWidth = A5_PRINT_WIDTH - A5_PRINT_MARGIN_X * 2 - A5_PRINT_GAP_X * (A5_PRINT_COLUMNS - 1);
  const usableHeight = A5_PRINT_HEIGHT - A5_PRINT_MARGIN_Y * 2 - A5_PRINT_GAP_Y * (A5_PRINT_ROWS - 1);
  const tileSize = Math.floor(Math.min(usableWidth / A5_PRINT_COLUMNS, usableHeight / A5_PRINT_ROWS));
  const totalGridWidth = tileSize * A5_PRINT_COLUMNS + A5_PRINT_GAP_X * (A5_PRINT_COLUMNS - 1);
  const totalGridHeight = tileSize * A5_PRINT_ROWS + A5_PRINT_GAP_Y * (A5_PRINT_ROWS - 1);
  const offsetX = Math.floor((A5_PRINT_WIDTH - totalGridWidth) / 2);
  const offsetY = Math.floor((A5_PRINT_HEIGHT - totalGridHeight) / 2);

  const tiles = Array.from({ length: A5_PRINT_COLUMNS * A5_PRINT_ROWS }, (_, index) => {
    const column = index % A5_PRINT_COLUMNS;
    const row = Math.floor(index / A5_PRINT_COLUMNS);
    const x = offsetX + column * (tileSize + A5_PRINT_GAP_X);
    const y = offsetY + row * (tileSize + A5_PRINT_GAP_Y);

    return `
      <rect x="${x - 10}" y="${y - 10}" width="${tileSize + 20}" height="${tileSize + 20}" rx="28" ry="28" fill="#ffffff" stroke="#ececec" stroke-width="3"/>
      <image href="${imageDataUrl}" x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" preserveAspectRatio="xMidYMid slice"/>
    `;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${A5_PRINT_WIDTH}" height="${A5_PRINT_HEIGHT}" viewBox="0 0 ${A5_PRINT_WIDTH} ${A5_PRINT_HEIGHT}">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${tiles}
</svg>`;
}

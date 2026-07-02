import { TRPCError } from "@trpc/server";
import sharp from "sharp";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { COMMON_PROMPT, PROMPT_CODES, PROMPT_VARIANTS, type PromptVariantCode } from "@shared/boothPrompts";
import {
  assignUniqueVariants,
  BGM_TRACKS,
  DEFAULT_BGM_TRACK_ID,
  buildA5PrintLayoutSvg,
  buildTransformationPrompt,
  getMonthlyPassword,
  type DetectedSubject,
  MAX_SUBJECTS,
  RESULT_AUTO_RETURN_MS,
  SIGNAGE_SUBTITLE,
  SIGNAGE_TITLE,
} from "./boothLogic";
import {
  completeBoothJob,
  createPreparedBoothJob,
  failBoothJob,
  getBoothHourlyCaptureStats,
  getBoothJobById,
  getTodayIsoDateKey,
  listBoothCaptureDateKeys,
  listBoothDevices,
  listRecentBoothJobs,
  markBoothJobProcessing,
  recordBoothCaptureEvent,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import {
  createSignageAdminSessionToken,
  getSignageAdminSessionMaxAgeMs,
  isValidSignageAdminPassword,
  SIGNAGE_ADMIN_COOKIE_NAME,
  verifySignageAdminSessionToken,
} from "./signageAdminAuth";

const detectionSchema = {
  name: "detected_subjects",
  strict: true,
  schema: {
    type: "object",
    properties: {
      subjectCount: {
        type: "integer",
        minimum: 0,
        maximum: 6,
      },
      subjects: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            subjectIndex: { type: "integer", minimum: 1, maximum: 6 },
            positionLabel: { type: "string" },
            appearanceSummary: { type: "string" },
          },
          required: ["subjectIndex", "positionLabel", "appearanceSummary"],
          additionalProperties: false,
        },
      },
    },
    required: ["subjectCount", "subjects"],
    additionalProperties: false,
  },
} as const;

function parseImageBase64(imageBase64: string) {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(cleaned, "base64");
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function createAiInputImage(buffer: Buffer, mimeType: string) {
  const transformed = sharp(buffer).flop();

  if (mimeType === "image/png") {
    return {
      buffer: await transformed.png().toBuffer(),
      mimeType: "image/png",
      extension: "png",
    } as const;
  }

  if (mimeType === "image/webp") {
    return {
      buffer: await transformed.webp().toBuffer(),
      mimeType: "image/webp",
      extension: "webp",
    } as const;
  }

  return {
    buffer: await transformed.jpeg().toBuffer(),
    mimeType: "image/jpeg",
    extension: "jpg",
  } as const;
}

export function buildAiInputPath(jobId: string, extension: string) {
  return `booth/${jobId}/ai-input.${extension}`;
}

function extractStorageKey(url: string) {
  return url.replace(/^\/manus-storage\//, "");
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function createSavedPrintLayout(jobId: string, generatedImageUrl: string) {
  const generatedImageKey = extractStorageKey(generatedImageUrl);
  const signedGeneratedImageUrl = await storageGetSignedUrl(generatedImageKey);
  const generatedResponse = await fetch(signedGeneratedImageUrl);

  if (!generatedResponse.ok) {
    throw new Error(`PRINT_LAYOUT_SOURCE_FETCH_FAILED:${generatedResponse.status}`);
  }

  const mimeType = generatedResponse.headers.get("content-type") ?? "image/png";
  const imageBuffer = Buffer.from(await generatedResponse.arrayBuffer());
  const svg = buildA5PrintLayoutSvg(toDataUrl(imageBuffer, mimeType));
  const pngBuffer = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();

  return storagePut(`booth/${jobId}/print-layout.png`, pngBuffer, "image/png");
}

async function detectSubjectsFromImage(imageUrl: string) {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You analyze a single event photo for a portrait AI photobooth. Count visible people carefully. Order subjects consistently from left to right, and if there are multiple depth layers, use top-to-bottom after left-to-right. Never infer more than are visible. Return concise summaries for each visible person so later prompts can target them.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Count the visible people in this photo. Return up to 6 visible people. If there are more than 5, set subjectCount to 6 to signal overflow. Keep each appearanceSummary under 18 words.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: detectionSchema,
    },
  });

  const content = result.choices[0]?.message.content;
  if (typeof content !== "string") {
    throw new Error("INVALID_DETECTION_RESPONSE");
  }

  const parsed = JSON.parse(content) as {
    subjectCount: number;
    subjects: DetectedSubject[];
  };

  return {
    subjectCount: parsed.subjectCount,
    subjects: parsed.subjects.slice(0, Math.max(parsed.subjectCount, 0)),
  };
}

const processCaptureInput = z.object({
  jobId: z.string().min(1),
  imageBase64: z.string().min(32),
  mimeType: z.string().default("image/jpeg"),
});

const adminPasswordInput = z.object({
  password: z.string().default(""),
});

const captureIntentInput = z.object({
  deviceId: z.string().min(8).max(64),
  localDateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  localHourKey: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}$/),
  jobId: z.string().min(1).optional(),
});

const adminStatsInput = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function readCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== cookieName) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(separatorIndex + 1));
  }

  return undefined;
}

function getRequestCookie(ctx: { req: { cookies?: Record<string, string | undefined>; headers?: Record<string, string | string[] | undefined> } }, cookieName: string) {
  const cookieFromParser = ctx.req.cookies?.[cookieName];
  if (cookieFromParser) {
    return cookieFromParser;
  }

  const cookieHeader = ctx.req.headers?.cookie;
  const normalizedHeader = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
  return readCookieValue(normalizedHeader, cookieName);
}

function hasSignageAdminSession(cookieValue: string | undefined) {
  return verifySignageAdminSessionToken(cookieValue);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  signage: router({
    getConfig: publicProcedure.query(() => ({
      title: SIGNAGE_TITLE,
      subtitle: SIGNAGE_SUBTITLE,
      defaultBgmTrackId: DEFAULT_BGM_TRACK_ID,
      bgmTracks: BGM_TRACKS,
      resultAutoReturnMs: RESULT_AUTO_RETURN_MS,
      maxSubjects: MAX_SUBJECTS,
      promptVariants: PROMPT_CODES.map(code => ({
        code,
        name: PROMPT_VARIANTS[code].name,
      })),
    })),
    adminStatus: publicProcedure.query(({ ctx }) => ({
      authenticated: hasSignageAdminSession(getRequestCookie(ctx, SIGNAGE_ADMIN_COOKIE_NAME)),
    })),
    adminUnlock: publicProcedure.input(adminPasswordInput).mutation(({ input, ctx }) => {
      if (!isValidSignageAdminPassword(input.password)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "管理者パスワードが正しくありません。",
        });
      }

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(SIGNAGE_ADMIN_COOKIE_NAME, createSignageAdminSessionToken(), {
        ...cookieOptions,
        httpOnly: true,
        maxAge: getSignageAdminSessionMaxAgeMs(),
      });
      return { success: true } as const;
    }),
    adminLogout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(SIGNAGE_ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    unlock: publicProcedure
      .input(
        z.object({
          password: z.string().default(""),
          previewBypass: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) => {
        const normalizedPassword = input.password.normalize("NFKC").trim();
        if (input.previewBypass) {
          return { success: true } as const;
        }
        if (normalizedPassword !== getMonthlyPassword()) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "パスワードが正しくありません。",
          });
        }
        return { success: true } as const;
      }),
    trackCaptureIntent: publicProcedure.input(captureIntentInput).mutation(async ({ input, ctx }) => {
      await recordBoothCaptureEvent({
        deviceId: input.deviceId,
        localDateKey: input.localDateKey,
        localHourKey: input.localHourKey,
        jobId: input.jobId,
        userAgent: ctx.req.get("user-agent") ?? null,
      });
      return { success: true } as const;
    }),
    prepareCapture: publicProcedure.mutation(async () => {
      const prepared = await createPreparedBoothJob();
      return {
        jobId: prepared.jobId,
        displayNumber: prepared.displayNumber,
        formattedReceipt: prepared.jobId,
        status: "prepared" as const,
      };
    }),
    processCapture: publicProcedure.input(processCaptureInput).mutation(async ({ input }) => {
      const sourceBuffer = parseImageBase64(input.imageBase64);
      const sourceExtension = extensionFromMimeType(input.mimeType);
      const sourceImage = await storagePut(`booth/${input.jobId}/original.${sourceExtension}`, sourceBuffer, input.mimeType);
      await markBoothJobProcessing(input.jobId, sourceImage);

      try {
        const aiInput = await createAiInputImage(sourceBuffer, input.mimeType);
        const aiInputImage = await storagePut(buildAiInputPath(input.jobId, aiInput.extension), aiInput.buffer, aiInput.mimeType);
        const aiInputSignedUrl = await storageGetSignedUrl(aiInputImage.key);
        const detection = await detectSubjectsFromImage(aiInputSignedUrl);

        if (detection.subjectCount === 0) {
          await failBoothJob(input.jobId, "NO_SUBJECT", "人物が認識できませんでした。");
          throw new TRPCError({ code: "BAD_REQUEST", message: "人物が認識できませんでした。もう一度撮影してください。" });
        }

        if (detection.subjectCount > MAX_SUBJECTS) {
          await failBoothJob(input.jobId, "TOO_MANY_SUBJECTS", "被写体が6名以上検出されました。");
          throw new TRPCError({ code: "BAD_REQUEST", message: "5名まででご利用ください。" });
        }

        const assignedVariants = assignUniqueVariants(detection.subjects.slice(0, detection.subjectCount));
        const prompt = buildTransformationPrompt(assignedVariants);
        const generated = await generateImage({
          prompt,
          originalImages: [{ url: aiInputSignedUrl, mimeType: aiInput.mimeType }],
        });

        if (!generated.url) {
          throw new Error("GENERATED_IMAGE_MISSING");
        }

        const printLayout = await createSavedPrintLayout(input.jobId, generated.url);

        await completeBoothJob({
          jobId: input.jobId,
          generatedImage: {
            key: extractStorageKey(generated.url),
            url: generated.url,
          },
          printLayout,
          subjectCount: detection.subjectCount,
          assignedVariantsJson: JSON.stringify(
            assignedVariants.map(subject => ({
              subjectIndex: subject.subjectIndex,
              positionLabel: subject.positionLabel,
              variantCode: subject.variantCode,
              variantName: subject.variantName,
            })),
          ),
          promptSummaryJson: JSON.stringify({
            commonPrompt: COMMON_PROMPT,
            assignedVariants: assignedVariants.map(subject => ({
              subjectIndex: subject.subjectIndex,
              variantCode: subject.variantCode,
              variantName: subject.variantName,
            })),
          }),
        });

        const job = await getBoothJobById(input.jobId);
        if (!job) {
          throw new Error("JOB_NOT_FOUND_AFTER_COMPLETE");
        }

        return {
          jobId: job.jobId,
          displayNumber: job.displayNumber,
          formattedReceipt: job.jobId,
          status: job.status,
          generatedImageUrl: job.generatedImageUrl,
          printLayoutUrl: job.printLayoutUrl,
          subjectCount: job.subjectCount,
          assignedVariants: JSON.parse(job.assignedVariantsJson ?? "[]") as Array<{
            subjectIndex: number;
            positionLabel: string;
            variantCode: PromptVariantCode;
            variantName: string;
          }>,
        };
      } catch (error) {
        if (!(error instanceof TRPCError)) {
          await failBoothJob(input.jobId, "PROCESSING_FAILED", error instanceof Error ? error.message : "AI processing failed");
        }
        throw error;
      }
    }),
    getJob: publicProcedure
      .input(
        z.object({
          jobId: z.string().min(1),
        }),
      )
      .query(async ({ input }) => {
        const job = await getBoothJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "受付情報が見つかりません。" });
        }

        return {
          jobId: job.jobId,
          displayNumber: job.displayNumber,
          formattedReceipt: job.jobId,
          status: job.status,
          generatedImageUrl: job.generatedImageUrl,
          printLayoutUrl: job.printLayoutUrl,
          sourceImageUrl: job.sourceImageUrl,
          subjectCount: job.subjectCount,
          assignedVariants: JSON.parse(job.assignedVariantsJson ?? "[]") as Array<{
            subjectIndex: number;
            positionLabel: string;
            variantCode: PromptVariantCode;
            variantName: string;
          }>,
          errorCode: job.errorCode,
          errorMessage: job.errorMessage,
          processedAt: job.processedAt,
        };
      }),
    getAdminHourlyStats: publicProcedure.input(adminStatsInput).query(async ({ input, ctx }) => {
      if (!hasSignageAdminSession(getRequestCookie(ctx, SIGNAGE_ADMIN_COOKIE_NAME))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "管理者メニューへログインしてください。" });
      }

      const availableDateKeys = await listBoothCaptureDateKeys();
      const selectedDateKey = input.dateKey ?? availableDateKeys[0] ?? getTodayIsoDateKey();
      const [rows, devices] = await Promise.all([
        getBoothHourlyCaptureStats({ dateKey: selectedDateKey }),
        listBoothDevices(),
      ]);

      const totalsByDevice = new Map<string, number>();
      for (const row of rows) {
        totalsByDevice.set(row.deviceId, (totalsByDevice.get(row.deviceId) ?? 0) + row.captureCount);
      }

      const deviceIds = Array.from(new Set([...devices.map(device => device.deviceId), ...rows.map(row => row.deviceId)]));

      return {
        selectedDateKey,
        availableDateKeys: availableDateKeys.length > 0 ? availableDateKeys : [selectedDateKey],
        devices: deviceIds.map(deviceId => ({
          deviceId,
          totalCaptures: totalsByDevice.get(deviceId) ?? 0,
        })),
        hourlyRows: rows.map(row => ({
          deviceId: row.deviceId,
          localDateKey: row.localDateKey,
          localHourKey: row.localHourKey,
          hourLabel: `${row.localHourKey.slice(11, 13)}:00`,
          captureCount: row.captureCount,
        })),
      };
    }),
    recentJobs: publicProcedure.query(async () => {
      const jobs = await listRecentBoothJobs();
      return jobs.map(job => ({
        jobId: job.jobId,
        displayNumber: job.displayNumber,
        status: job.status,
        generatedImageUrl: job.generatedImageUrl,
        printLayoutUrl: job.printLayoutUrl,
        subjectCount: job.subjectCount,
        processedAt: job.processedAt,
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;

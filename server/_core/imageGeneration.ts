/**
 * Image editing helper using OpenAI GPT image models.
 *
 * The booth passes the captured source image as a URL and requests a
 * transformed PNG output, which is then stored via the existing storage layer.
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

type OpenAiImagesEditResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

const OPENAI_IMAGE_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5";

function resolveInputImageUrl(
  image:
    | {
        url?: string;
        b64Json?: string;
        mimeType?: string;
      }
    | undefined,
) {
  if (!image) return "";

  if (image.url) {
    return image.url;
  }

  if (image.b64Json) {
    const mimeType = image.mimeType || "image/png";
    return `data:${mimeType};base64,${image.b64Json}`;
  }

  return "";
}

export async function generateImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResponse> {
  if (!ENV.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const inputImageUrl = resolveInputImageUrl(options.originalImages?.[0]);
  if (!inputImageUrl) {
    throw new Error("ORIGINAL_IMAGE_MISSING");
  }

  const response = await fetch(OPENAI_IMAGE_EDIT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_IMAGE_MODEL,
      prompt: options.prompt,
      images: [{ image_url: inputImageUrl }],
      input_fidelity: "high",
      output_format: "png",
      quality: "medium",
      size: "1024x1024",
      background: "opaque",
      moderation: "auto",
      n: 1,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }

  const result = (await response.json()) as OpenAiImagesEditResponse;
  const base64Data = result.data?.[0]?.b64_json;

  if (!base64Data) {
    throw new Error("OPENAI_IMAGE_DATA_MISSING");
  }

  const buffer = Buffer.from(base64Data, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");

  return {
    url,
  };
}

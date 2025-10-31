import { z } from "zod";

type CurioFlexVideoPayload = {
  prompt: string;
  storyboard?: string | null;
  referenceImage?: string | null;
  duration: string;
  aspectRatio: string;
};

type GeneratedVideo = {
  mimeType: string;
  videoBase64: string;
};

const envSchema = z.object({
  apiKey: z.string().min(1, "CURIO_FLEX_API_KEY is required"),
  model: z
    .string()
    .min(1, "CURIO_FLEX_VIDEO_MODEL is required"),
  apiVersion: z.string().optional().default("v1beta"),
  baseUrl: z.string().url().optional().default("https://generativelanguage.googleapis.com"),
  pollIntervalMs: z.coerce.number().optional().default(5_000),
  maxPollAttempts: z.coerce.number().optional().default(60),
});

type Operation = {
  name?: string;
  done?: boolean;
  error?: { message?: string; code?: number };
  response?: unknown;
};

type VideoCandidate = {
  bytes?: string;
  mimeType?: string;
  uri?: string;
};

function cleanEnv(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getEnv() {
  const parsed = envSchema.parse({
    apiKey: cleanEnv(process.env.CURIO_FLEX_API_KEY),
    model: cleanEnv(process.env.CURIO_FLEX_VIDEO_MODEL),
    apiVersion: cleanEnv(process.env.CURIO_FLEX_VIDEO_API_VERSION),
    baseUrl: cleanEnv(process.env.CURIO_FLEX_VIDEO_BASE_URL),
    pollIntervalMs: cleanEnv(process.env.CURIO_FLEX_VIDEO_POLL_INTERVAL_MS),
    maxPollAttempts: cleanEnv(process.env.CURIO_FLEX_VIDEO_MAX_POLL_ATTEMPTS),
  });

  return {
    ...parsed,
    baseUrl: parsed.baseUrl.replace(/\/?$/, ""),
  };
}

function parseDataUrl(dataUrl: string) {
  const pattern = /^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/;
  const match = dataUrl.match(pattern);

  if (!match?.groups) {
    throw new Error("Reference image must be a base64 data URL");
  }

  return { mimeType: match.groups.mime, data: match.groups.data };
}

function buildPrompt(prompt: string, storyboard?: string | null) {
  const trimmedPrompt = prompt.trim();
  const trimmedStoryboard = storyboard?.trim();

  if (trimmedStoryboard) {
    return `${trimmedPrompt}\n\nStoryboard beats:\n${trimmedStoryboard}`;
  }

  return trimmedPrompt;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseRelativeUri(uri: string, baseUrl: string, apiVersion: string) {
  if (/^https?:/i.test(uri)) {
    return uri;
  }

  const trimmed = uri.replace(/^\//, "");
  return `${baseUrl}/${apiVersion}/${trimmed}`;
}

function searchForVideoCandidate(node: unknown): VideoCandidate | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const candidate = searchForVideoCandidate(item);
      if (candidate) return candidate;
    }
    return null;
  }

  const candidate = node as Record<string, unknown>;
  if (typeof candidate.bytesBase64Encoded === "string" && candidate.bytesBase64Encoded.length > 0) {
    return {
      bytes: candidate.bytesBase64Encoded,
      mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
    };
  }

  if (typeof candidate.videoBytes === "string" && candidate.videoBytes.length > 0) {
    return {
      bytes: candidate.videoBytes,
      mimeType: typeof candidate.videoMimeType === "string" ? candidate.videoMimeType : undefined,
    };
  }

  if (typeof candidate.base64Video === "string" && candidate.base64Video.length > 0) {
    return {
      bytes: candidate.base64Video,
      mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
    };
  }

  if (typeof candidate.uri === "string" && candidate.uri.length > 0) {
    return {
      uri: candidate.uri,
      mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
    };
  }

  if (typeof candidate.fileUri === "string" && candidate.fileUri.length > 0) {
    return {
      uri: candidate.fileUri,
      mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
    };
  }

  for (const value of Object.values(candidate)) {
    const nested = searchForVideoCandidate(value);
    if (nested) return nested;
  }

  return null;
}

async function downloadVideoFromUri(uri: string, apiKey: string, baseUrl: string, apiVersion: string): Promise<GeneratedVideo> {
  const resolved = normaliseRelativeUri(uri, baseUrl, apiVersion);
  const url = new URL(resolved);
  if (!url.searchParams.has("alt")) {
    url.searchParams.set("alt", "media");
  }

  const response = await fetch(url.toString(), {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to download generated video (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    mimeType: response.headers.get("content-type") ?? "video/mp4",
    videoBase64: Buffer.from(arrayBuffer).toString("base64"),
  };
}

const SUPPORTED_DURATIONS = new Set([4, 6, 8]);

function sanitiseDuration(duration: string) {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Duration must be a positive number of seconds");
  }

  if (!SUPPORTED_DURATIONS.has(parsed)) {
    throw new Error("Configured video model only supports 4s, 6s, or 8s durations");
  }

  return parsed;
}

export async function generateVideo({
  prompt,
  storyboard,
  referenceImage,
  duration,
  aspectRatio,
}: CurioFlexVideoPayload): Promise<GeneratedVideo> {
  const { apiKey, model, apiVersion, baseUrl, pollIntervalMs, maxPollAttempts } = getEnv();

  const combinedPrompt = buildPrompt(prompt, storyboard);
  const durationSeconds = sanitiseDuration(duration);

  const instance: Record<string, unknown> = {
    prompt: combinedPrompt,
  };

  const parameters: Record<string, unknown> = {
    durationSeconds,
    aspectRatio,
  };

  if (referenceImage) {
    if (aspectRatio !== "16:9") {
      throw new Error("Configured video model only supports 16:9 when supplying a reference image");
    }

    if (durationSeconds !== 8) {
      throw new Error("Configured video model requires an 8 second duration when using a reference image");
    }

    const { mimeType, data } = parseDataUrl(referenceImage);

    instance.referenceImages = [
      {
        referenceType: "ASSET",
        image: {
          mimeType,
          bytesBase64Encoded: data,
        },
      },
    ];
  }

  const endpoint = `${baseUrl}/${apiVersion}/models/${model}:predictLongRunning`;

  const initialResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      instances: [instance],
      parameters,
    }),
  });

  const operation: Operation = await initialResponse.json();

  if (!initialResponse.ok) {
    const message = operation.error?.message ?? "AimShreem Flex Video generation request failed";
    throw new Error(message);
  }

  if (!operation.name) {
    throw new Error("AimShreem Flex Video generation did not return an operation name");
  }

  let attempts = 0;
  let currentOperation: Operation = operation;

  while (!currentOperation.done) {
    if (attempts >= maxPollAttempts) {
      throw new Error("AimShreem Flex Video generation timed out before completion");
    }

    await wait(pollIntervalMs);
    attempts += 1;

    const pollResponse = await fetch(`${baseUrl}/${apiVersion}/${currentOperation.name}`, {
      headers: {
        "x-goog-api-key": apiKey,
      },
    });

    currentOperation = await pollResponse.json();

    if (!pollResponse.ok) {
      const message = currentOperation.error?.message ?? "AimShreem Flex Video polling failed";
      throw new Error(message);
    }
  }

  if (currentOperation.error) {
    throw new Error(currentOperation.error.message ?? "AimShreem Flex Video generation failed");
  }

  const candidate = searchForVideoCandidate(currentOperation.response);

  if (!candidate) {
    throw new Error("AimShreem Flex Video generation did not yield a video output");
  }

  if (candidate.bytes) {
    return {
      mimeType: candidate.mimeType ?? "video/mp4",
      videoBase64: candidate.bytes,
    };
  }

  if (candidate.uri) {
    return downloadVideoFromUri(candidate.uri, apiKey, baseUrl, apiVersion);
  }

  throw new Error("AimShreem Flex Video result could not be parsed");
}

export type { CurioFlexVideoPayload, GeneratedVideo };

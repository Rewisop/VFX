import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

type GeneratePayload = {
  prompt: string;
  referenceImage: string;
};

const envSchema = z.object({
  apiKey: z.string().min(1, "CURIO_FLEX_API_KEY is required"),
  model: z.string().min(1, "CURIO_FLEX_IMAGE_MODEL is required"),
});

function getEnv() {
  return envSchema.parse({
    apiKey: process.env.CURIO_FLEX_API_KEY,
    model: process.env.CURIO_FLEX_IMAGE_MODEL,
  });
}

type ParsedDataUrl = {
  mimeType: string;
  data: string;
};

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const pattern = /^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/;
  const match = dataUrl.match(pattern);
  if (!match?.groups) {
    throw new Error("Reference image must be a base64 data URL");
  }

  return { mimeType: match.groups.mime, data: match.groups.data };
}

const responseSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

export async function generateImage(payload: GeneratePayload) {
  const { apiKey, model } = getEnv();
  const { data: imageData, mimeType } = parseDataUrl(payload.referenceImage);

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model });

  const result = await generativeModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: payload.prompt },
          { inlineData: { mimeType, data: imageData } },
        ],
      },
    ],
  });

  const imagePart = result.response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("AimShreem Flex did not return an image");
  }

  return responseSchema.parse({
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
  });
}

export type { GeneratePayload };

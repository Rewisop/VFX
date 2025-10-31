import { NextResponse } from "next/server";
import { z } from "zod";

import { generateVideo } from "@/lib/curio-flex-video";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  storyboard: z.string().optional().nullable(),
  referenceImage: z.string().optional().nullable(),
  duration: z.string().min(1, "Duration is required"),
  aspectRatio: z.string().min(1, "Aspect ratio is required"),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const video = await generateVideo(payload);

    return NextResponse.json({
      video: video.videoBase64,
      mimeType: video.mimeType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("AimShreem Flex Video generate error", error);
    return NextResponse.json({ error: "Failed to generate AimShreem Flex Video" }, { status: 502 });
  }
}

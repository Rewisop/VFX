import { NextResponse } from "next/server";
import { z } from "zod";

import { generateImage } from "@/lib/curio-flex";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  referenceImage: z.string().min(1, "Reference image data is required"),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const image = await generateImage(payload);
    return NextResponse.json({
      image: `data:${image.mimeType};base64,${image.imageBase64}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("AimShreem Flex generate error", error);
    return NextResponse.json({ error: "Failed to generate AimShreem Flex image" }, { status: 502 });
  }
}

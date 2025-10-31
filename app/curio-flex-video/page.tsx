"use client";

import NextImage from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";

import Particles from "@/components/Particles";

type GenerationStatus = "idle" | "running" | "succeeded" | "failed";

type GenerationResponse = {
  video: string;
  mimeType: string;
};

const statusMessages: Record<GenerationStatus, string> = {
  idle: "Ready for your AimShreem Flex Video concept",
  running: "Rendering motion cues...",
  succeeded: "Motion test rendered",
  failed: "The AimShreem Flex Video muse is silent",
};

export default function AimShreemFlexVideoPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [storyboard, setStoryboard] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>("");
  const [shotDuration, setShotDuration] = useState("8");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMimeType, setResultMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResult = useMemo(() => status === "succeeded" && !!resultUrl, [status, resultUrl]);

  const aspectClass = useMemo(() => {
    const ratioClassMap: Record<string, string> = {
      "16:9": "aspect-[16/9]",
      "9:16": "aspect-[9/16]",
      "1:1": "aspect-square",
      "2.39:1": "aspect-[239/100]",
    };

    return ratioClassMap[aspectRatio] ?? "aspect-[16/9]";
  }, [aspectRatio]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unable to read file"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);
    setResultUrl(null);
    setResultMimeType(null);
    setStatus("idle");
    setReferenceName(file.name);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReferenceImage(dataUrl);
    } catch (err) {
      console.error(err);
      setError("Could not read the reference frame");
    }
  }, []);

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty");
      return;
    }

    if (referenceImage && shotDuration !== "8") {
      setError("Veo 3.1 requires an 8 second video when using a reference frame.");
      setStatus("failed");
      return;
    }

    if (referenceImage && aspectRatio !== "16:9") {
      setError("Reference frames only work with the 16:9 aspect ratio on Veo 3.1.");
      setStatus("failed");
      return;
    }

    setIsSubmitting(true);
    setStatus("running");
    setError(null);
    setResultUrl(null);
    setResultMimeType(null);

    try {
      const response = await fetch("/api/curio-flex-video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          storyboard,
          referenceImage,
          duration: shotDuration,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data: GenerationResponse = await response.json();
      const dataUrl = `data:${data.mimeType};base64,${data.video}`;
      setResultUrl(dataUrl);
      setResultMimeType(data.mimeType);
      setStatus("succeeded");
    } catch (err) {
      console.error(err);
      setError("Could not generate with AimShreem Flex Video. Please retry.");
      setStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [prompt, storyboard, referenceImage, shotDuration, aspectRatio]);

  const onDownload = useCallback(() => {
    if (!hasResult || !resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    const extension = (() => {
      if (!resultMimeType) return "mp4";
      if (resultMimeType === "video/webm") return "webm";
      if (resultMimeType === "video/mp4") return "mp4";
      return "video";
    })();
    link.download = `aimshreem-flex-video.${extension}`;
    link.click();
  }, [hasResult, resultUrl, resultMimeType]);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      await handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const onRemoveReference = useCallback(() => {
    setReferenceImage(null);
    setReferenceName("");
  }, []);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-none flex-col gap-12 px-6 pb-24 pt-20 sm:px-10 lg:px-16">
      <div className="absolute inset-0 -z-10 opacity-70">
        <Particles className="h-full w-full" />
      </div>

      <header className="flex flex-col gap-4 text-center sm:gap-6">
        <p className="text-sm uppercase tracking-[0.4em] text-orange-200/70">AimShreem Flex Video Story Lab</p>
        <h1 className="text-4xl font-semibold tracking-tight text-orange-50 sm:text-5xl md:text-6xl">
          Animate your concept
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-orange-100/80">
          Feed AimShreem Flex Video a reference frame and narrative brief to conjure motion-first concept art, tailored for your
          next shot.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(24rem,32rem)_minmax(0,1fr)] xl:grid-cols-[minmax(26rem,34rem)_minmax(0,1fr)]">
        <div className="glow-card flex flex-col gap-6 p-6 sm:p-8">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="drop-zone"
            role="button"
            tabIndex={0}
            onClick={onUploadClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onUploadClick();
              }
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-orange-200">
                Optional Frame
              </span>
              <p className="text-base font-semibold text-orange-50">Drag & drop or click to upload</p>
              <p className="text-sm text-orange-100/60">PNG, JPG up to 5MB</p>
              {referenceName ? (
                <div className="flex flex-col items-center gap-1 text-orange-100/80">
                  <p className="text-sm">Loaded: {referenceName}</p>
                  <button
                    type="button"
                    className="text-xs uppercase tracking-[0.3em] text-orange-300/80 hover:text-orange-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveReference();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-sm text-orange-100/60">No frame selected</p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => void handleFiles(event.target.files)}
          />

          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200">Scene Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the motion, emotion, and lighting cues..."
              className="input-field min-h-[140px] resize-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200">Storyboard Beats (optional)</label>
            <textarea
              value={storyboard}
              onChange={(event) => setStoryboard(event.target.value)}
              placeholder="Break down key beats, dialogue, or camera moves to guide AimShreem Flex Video."
              className="input-field min-h-[120px] resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-200">Shot Duration</label>
              <select
                value={shotDuration}
                onChange={(event) => setShotDuration(event.target.value)}
                className="input-field appearance-none"
              >
                <option value="4">4 seconds</option>
                <option value="6">6 seconds</option>
                <option value="8">8 seconds</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-200">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value)}
                className="input-field appearance-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="2.39:1">2.39:1</option>
              </select>
            </div>
          </div>

          {referenceImage && (
            <p className="text-xs text-orange-200/70">
              Reference-guided runs are locked to 8 seconds and a 16:9 frame on Veo 3.1.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="status-pill">
                <span className="inline-flex h-2 w-2 rounded-full bg-orange-300 shadow-neon" />
                {statusMessages[status]}
              </span>
              {error && <span className="text-sm text-orange-200/70">{error}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="button-primary"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Rendering" : "Generate Video"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={onDownload}
                disabled={!hasResult}
              >
                Download Video
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/80 p-6 sm:p-10">
          <div className="absolute inset-0">
            <Particles className="h-full w-full" />
          </div>
          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">AimShreem Flex Video Preview</p>
                <p className="text-xs uppercase tracking-[0.4em] text-orange-200/50">
                  {shotDuration}s &bull; {aspectRatio} frame
                </p>
              </div>
              {status === "running" && (
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-500/40 border-t-orange-400/90"></div>
                  <div className="absolute h-12 w-12 animate-ping rounded-full bg-gradient-to-r from-orange-500/70 to-orange-300/70 blur-xl"></div>
                </div>
              )}
            </div>
            <div className={`relative w-full overflow-hidden rounded-3xl border border-orange-200/20 bg-slate-950/60 shadow-neon ${aspectClass}`}>
              {resultUrl ? (
                <video
                  key={resultUrl}
                  controls
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                >
                  <source src={resultUrl} type={resultMimeType ?? "video/mp4"} />
                </video>
              ) : referenceImage ? (
                <NextImage
                  src={referenceImage}
                  alt="Reference frame preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-80"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-orange-100/70">
                  <p className="text-lg font-semibold">Seed AimShreem Flex Video with imagery + narrative</p>
                  <p className="max-w-xs text-sm text-orange-100/60">
                    Upload a frame or concept art, then map the sequence beats to preview how AimShreem Flex Video might choreograph
                    the shot.
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-400/10" />
            </div>
            <div className="rounded-3xl border border-orange-500/10 bg-slate-900/70 p-5 text-sm text-orange-100/70">
              <p className="font-semibold uppercase tracking-[0.3em] text-orange-200/70">Brief Summary</p>
              <p className="mt-2 text-orange-100/80">
                {prompt ? prompt : "Add a prompt to outline the motion you want AimShreem Flex Video to explore."}
              </p>
              {storyboard && (
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-orange-200/60">Storyboard Beats</p>
              )}
              {storyboard && <p className="mt-1 text-orange-100/70">{storyboard}</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

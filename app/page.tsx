"use client";

import NextImage from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";

import Particles from "@/components/Particles";

type GenerationStatus = "idle" | "running" | "succeeded" | "failed";

const funkyMessages: Record<GenerationStatus, string> = {
  idle: "Awaiting your neon vision",
  running: "Conjuring particle storms...",
  succeeded: "Composite conjured!",
  failed: "The portal fizzled",
};

function FunkyLoading() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#00bbff]/30 border-t-[#9adfff]"></div>
      <div className="absolute h-12 w-12 animate-ping rounded-full bg-gradient-to-r from-[#00bbff]/40 to-[#66e1ff]/40 blur-xl"></div>
      <div className="absolute h-24 w-24 animate-pulse rounded-full border border-[#66e1ff]/25 blur-sm" />
    </div>
  );
}

type GenerationResponse = {
  image: string;
};

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResult = useMemo(() => status === "succeeded" && !!resultUrl, [status, resultUrl]);

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
    setStatus("idle");
    setReferenceName(file.name);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReferenceImage(dataUrl);
    } catch (err) {
      console.error(err);
      setError("Could not read the reference image");
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (!referenceImage) {
      setError("Reference image required");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setStatus("running");
    setError(null);
    setResultUrl(null);

    try {
      const response = await fetch("/api/curio-flex/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, referenceImage }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data: GenerationResponse = await response.json();
      setResultUrl(data.image);
      setStatus("succeeded");
    } catch (err) {
      console.error(err);
      setError("Could not generate with AimShreem Flex. Please retry.");
      setStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [prompt, referenceImage]);

  const onDownload = useCallback(() => {
    if (!hasResult || !resultUrl) return;

    try {
      const link = document.createElement("a");
      link.href = resultUrl;
      link.download = "aimshreem-flex-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Unable to download image preview.");
    }
  }, [hasResult, resultUrl, setError]);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      await handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[120rem] flex-col gap-12 px-6 pb-24 pt-20 lg:px-12">
      <div className="absolute inset-0 -z-10 opacity-70">
        <Particles className="h-full w-full" />
      </div>
      <header className="flex flex-col gap-4 text-center sm:gap-6">
        <p className="text-sm uppercase tracking-[0.4em] text-[#9adfff]">AimShreem Flex Image Studio</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#e0f7ff] sm:text-5xl md:text-6xl">
          AimShreem Flex
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-[#9adfff]">
          Drop in a reference frame, riff a prompt, and let AimShreem Flex remix it into neon-drenched composites.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] xl:grid-cols-[minmax(0,460px)_1fr]">
        <div className="glow-card flex flex-col gap-6 p-6 sm:p-8 lg:max-w-[420px] lg:w-full xl:max-w-[460px]">
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
              <span className="rounded-full bg-[#00bbff]/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#e0f7ff]">
                Reference
              </span>
              <p className="text-base font-semibold text-[#e0f7ff]">Drag & drop or click to upload</p>
              <p className="text-sm text-[#9adfff]/70">PNG, JPG up to 5MB</p>
              {referenceName ? (
                <p className="text-sm text-[#e0f7ff]">Loaded: {referenceName}</p>
              ) : (
                <p className="text-sm text-[#9adfff]/70">No file selected</p>
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
            <label className="text-sm font-semibold uppercase tracking-[0.25em] text-[#66e1ff]">Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the VFX twist..."
              className="input-field min-h-[140px] resize-none"
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="status-pill">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#9adfff] shadow-neon" />
                {funkyMessages[status]}
              </span>
              {error && <span className="text-sm text-[#9adfff]">{error}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="button-primary"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Summoning" : "Generate"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={onDownload}
                disabled={!hasResult}
              >
                Download Composite
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[#00bbff]/25 bg-gradient-to-br from-[#030028]/80 via-[#05003a]/70 to-[#030028]/80 p-6 sm:p-10">
          <div className="absolute inset-0">
            <Particles className="h-full w-full" />
          </div>
          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-[#9adfff]">Live Preview</p>
              {status === "running" && <FunkyLoading />}
            </div>
            <div className="relative w-full overflow-hidden rounded-3xl border border-[#00bbff]/25 bg-[#05003a]/60 shadow-neon aspect-[16/9] min-h-[360px] sm:min-h-[420px]">
              {resultUrl ? (
                <NextImage
                  src={resultUrl}
                  alt="Generated VFX result"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : referenceImage ? (
                <NextImage
                  src={referenceImage}
                  alt="Reference preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-80"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-[#9adfff]">
                  <p className="text-lg font-semibold">Your VFX masterpiece awaits</p>
                  <p className="max-w-xs text-sm text-[#9adfff]/70">
                    Upload a reference image and craft a prompt to watch particles swirl it into something new.
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00bbff]/10 via-transparent to-[#66e1ff]/10" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

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
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-500/40 border-t-orange-400/90"></div>
      <div className="absolute h-12 w-12 animate-ping rounded-full bg-gradient-to-r from-orange-500/70 to-orange-300/70 blur-xl"></div>
      <div className="absolute h-24 w-24 animate-pulse rounded-full border border-orange-500/30 blur-sm" />
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
    <main className="relative mx-auto flex min-h-screen w-full max-w-none flex-col gap-12 px-6 pb-24 pt-20 sm:px-10 lg:px-16">
      <div className="absolute inset-0 -z-10 opacity-70">
        <Particles className="h-full w-full" />
      </div>
      <header className="flex flex-col gap-4 text-center sm:gap-6">
        <p className="text-sm uppercase tracking-[0.4em] text-orange-200/70">AimShreem Flex Image Studio</p>
        <h1 className="text-4xl font-semibold tracking-tight text-orange-50 sm:text-5xl md:text-6xl">
          AimShreem Flex
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-orange-100/80">
          Drop in a reference frame, riff a prompt, and let AimShreem Flex remix it into neon-drenched composites.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] xl:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)]">
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
                Reference
              </span>
              <p className="text-base font-semibold text-orange-50">Drag & drop or click to upload</p>
              <p className="text-sm text-orange-100/60">PNG, JPG up to 5MB</p>
              {referenceName ? (
                <p className="text-sm text-orange-100/80">Loaded: {referenceName}</p>
              ) : (
                <p className="text-sm text-orange-100/60">No file selected</p>
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
            <label className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200">Prompt</label>
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
                <span className="inline-flex h-2 w-2 rounded-full bg-orange-300 shadow-neon" />
                {funkyMessages[status]}
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

        <div className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/80 p-6 sm:p-10">
          <div className="absolute inset-0">
            <Particles className="h-full w-full" />
          </div>
          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">Live Preview</p>
              {status === "running" && <FunkyLoading />}
            </div>
            <div className="relative w-full overflow-hidden rounded-3xl border border-orange-200/20 bg-slate-950/60 shadow-neon aspect-[16/9]">
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
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-orange-100/70">
                  <p className="text-lg font-semibold">Your VFX masterpiece awaits</p>
                  <p className="max-w-xs text-sm text-orange-100/60">
                    Upload a reference image and craft a prompt to watch particles swirl it into something new.
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-400/10" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

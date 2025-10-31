"use client";

import { useEffect, useRef } from "react";

export function Particles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    let viewWidth = 0;
    let viewHeight = 0;

    const waves = Array.from({ length: 6 }).map((_, index) => ({
      amplitude: 28 + index * 12,
      wavelength: 180 + index * 25,
      speed: 0.16 + index * 0.04,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      viewWidth = rect.width;
      viewHeight = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const step = () => {
      ctx.clearRect(0, 0, viewWidth, viewHeight);

      const time = performance.now() / 1000;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      waves.forEach((wave, index) => {
        const depthRange = Math.min(viewHeight / waves.length, 90);
        const center = viewHeight / 2;
        const stackOffset = (index - (waves.length - 1) / 2) * depthRange;
        const baseline = center + stackOffset + Math.sin(time * 0.25 + index) * Math.min(viewHeight / 6, 40);
        const amplitude = Math.min(wave.amplitude, viewHeight / 3) * (0.6 + Math.sin(time * 0.15 + index) * 0.25);
        const frequency = (Math.PI * 2) / wave.wavelength;
        const phase = time * wave.speed + wave.phase;

        const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
        gradient.addColorStop(0, `rgba(154, 223, 255, ${0.12 + index * 0.05})`);
        gradient.addColorStop(1, `rgba(102, 225, 255, ${0.08 + index * 0.05})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.6 + index * 0.4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(0, 187, 255, 0.25)";

        ctx.beginPath();
        ctx.moveTo(0, baseline);

        for (let x = 0; x <= viewWidth; x += 4) {
          const y = baseline + Math.sin(frequency * x + phase) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      });

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      animationFrameId = window.requestAnimationFrame(step);
    };

    const handleResize = () => {
      resize();
    };

    resize();
    animationFrameId = window.requestAnimationFrame(step);
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}

export default Particles;

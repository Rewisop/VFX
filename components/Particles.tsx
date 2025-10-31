"use client";

import { useEffect, useRef } from "react";

type Wave = {
  amplitude: number;
  wavelength: number;
  speed: number;
  offset: number;
  phase: number;
  thickness: number;
  opacity: number;
  shift: number;
};

const WAVE_COUNT = 6;

export function Particles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const waves: Wave[] = Array.from({ length: WAVE_COUNT }, (_, index) => ({
      amplitude: 18 + Math.random() * 16 + index * 4,
      wavelength: 160 + Math.random() * 140,
      speed: 0.18 + Math.random() * 0.12 + index * 0.015,
      offset: (index + 1) / (WAVE_COUNT + 1),
      phase: Math.random() * Math.PI * 2,
      thickness: 1.4 + Math.random() * 1.1,
      opacity: 0.08 + Math.random() * 0.05,
      shift: Math.random() * 240,
    }));

    let viewWidth = 0;
    let viewHeight = 0;

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

    const step = (timestamp: number) => {
      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "rgba(9, 17, 40, 0.35)";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      const time = timestamp / 1000;

      waves.forEach((wave, index) => {
        const baseY = viewHeight * wave.offset;
        const amplitude = wave.amplitude;
        const wavelength = wave.wavelength;
        const speed = wave.speed;
        const oscillation = Math.sin(time * 0.35 + index);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, baseY);

        for (let x = 0; x <= viewWidth + 16; x += 3) {
          const progress = ((x + wave.shift) / wavelength) * Math.PI * 2;
          const y = baseY + Math.sin(progress + wave.phase + time * speed * 2) * (amplitude + oscillation * 4);
          ctx.lineTo(x, y);
        }

        const gradient = ctx.createLinearGradient(0, baseY - amplitude - 60, 0, baseY + amplitude + 60);
        gradient.addColorStop(0, `hsla(${205 + index * 4}, 88%, 72%, ${wave.opacity * 0.7})`);
        gradient.addColorStop(0.5, `hsla(${200 + index * 3}, 82%, 65%, ${wave.opacity})`);
        gradient.addColorStop(1, `hsla(${210 + index * 5}, 88%, 72%, ${wave.opacity * 0.7})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = wave.thickness + oscillation * 0.35;
        ctx.shadowColor = `hsla(${202 + index * 4}, 85%, 68%, ${wave.opacity * 1.5})`;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(120, 180, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < viewWidth; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x + (Math.sin(time * 0.4 + x * 0.005) * 10), 0);
        ctx.lineTo(x - (Math.cos(time * 0.4 + x * 0.005) * 10), viewHeight);
        ctx.stroke();
      }
      ctx.restore();

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

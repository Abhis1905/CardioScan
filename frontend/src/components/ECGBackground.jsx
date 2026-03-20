import { useEffect, useRef } from "react";

export default function ECGBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let offset = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ECG waveform points (normalized 0-1)
    const ecgPattern = [
      0.5, 0.5, 0.5, 0.5, 0.48, 0.52, 0.5,
      0.5, 0.5, 0.42, 0.18, 0.82, 0.38, 0.5,
      0.5, 0.5, 0.45, 0.38, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    ];

    const LINES = 3;
    const LINE_SPACING = window.innerHeight / (LINES + 1);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      offset += 0.8;

      for (let line = 0; line < LINES; line++) {
        const y = LINE_SPACING * (line + 1);
        const alpha = line === 1 ? 0.06 : 0.03;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(244,63,94,${alpha})`;
        ctx.lineWidth = 1;

        for (let x = 0; x < canvas.width + 80; x += 2) {
          const patternLen = ecgPattern.length * 20;
          const px = ((x + offset + line * 200) % patternLen) / patternLen;
          const idx = Math.floor(px * ecgPattern.length);
          const ecgY = y + (ecgPattern[idx] - 0.5) * 60;

          if (x === 0) ctx.moveTo(x, ecgY);
          else ctx.lineTo(x, ecgY);
        }
        ctx.stroke();

        // Moving bright dot on the center line
        if (line === 1) {
          const dotX = (offset * 0.8) % canvas.width;
          const patternLen = ecgPattern.length * 20;
          const px = (dotX % patternLen) / patternLen;
          const idx = Math.floor(px * ecgPattern.length);
          const dotY = y + (ecgPattern[idx] - 0.5) * 60;

          const grad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 8);
          grad.addColorStop(0, "rgba(244,63,94,0.6)");
          grad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 1 }}
    />
  );
}

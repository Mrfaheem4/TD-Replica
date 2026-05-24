import { useRef, useEffect } from "react";
import { useHandTracking } from "../hooks/useHandTracking";
import { useHandStore } from "../store/handStore";

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];

const ASCII_CHARS = [
  "@",
  "#",
  "S",
  "%",
  "?",
  "*",
  "+",
  ";",
  ":",
  ",",
  ".",
  " ",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
];

export const HandTracker = () => {
  const rectModeRef = useRef<"ascii" | "heat">("ascii");
  const pinchCooldownRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const outerFilledSegmentsRef = useRef<Map<number, string>>(new Map());
  const outerDisplayedSegmentsRef = useRef<
    Map<number, { color: string; alpha: number }>
  >(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayedSegmentsRef = useRef<
    Map<number, { color: string; alpha: number }>
  >(new Map());
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(
    document.createElement("canvas"),
  );
  const wheelAngleRef = useRef(0);
  const wheelVelocityRef = useRef(0);
  const filledSegmentsRef = useRef<Map<number, string>>(new Map());
  useHandTracking(videoRef);

  const { landmarks, rotation, openness, velocity, depth, isTracking } =
    useHandStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const asciiCanvas = asciiCanvasRef.current;
    if (!canvas || !video || !asciiCanvas) return;
    const ctx = canvas.getContext("2d");
    const asciiCtx = asciiCanvas.getContext("2d");
    if (!ctx || !asciiCtx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    asciiCanvas.width = window.innerWidth;
    asciiCanvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    asciiCtx.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);

    if (!landmarks.length) return;

    const W = canvas.width;
    const H = canvas.height;

    const videoAspect = video.videoWidth / video.videoHeight;
    const screenAspect = W / H;

    let scaleX, scaleY, offsetX, offsetY;

    if (videoAspect > screenAspect) {
      scaleY = H;
      scaleX = H * videoAspect;
      offsetX = (W - scaleX) / 2;
      offsetY = 0;
    } else {
      scaleX = W;
      scaleY = W / videoAspect;
      offsetX = 0;
      offsetY = (H - scaleY) / 2;
    }

    const x = (lx: number) => (1 - lx) * scaleX + offsetX;
    const y = (ly: number) => ly * scaleY + offsetY;

    // Circular Wheel + Color Segments

    if (landmarks.length === 1) {
      const lm = landmarks[0];
      const palm = { x: x(lm[9].x), y: y(lm[9].y) };

      const WHEEL_COLORS = [
        "rgba(255, 0, 128, 0.95)",
        "rgba(255, 200, 0, 0.95)",
        "rgba(180, 0, 255, 0.95)",
        "rgba(0, 200, 255, 0.95)",
        "rgba(255, 60, 0, 0.95)",
        "rgba(0, 255, 120, 0.95)",
      ];

      const newAngle = ((rotation * Math.PI) / 180) * 2;
      const delta = newAngle - wheelAngleRef.current;
      wheelVelocityRef.current = delta * 0.2;
      wheelAngleRef.current += wheelVelocityRef.current;
      wheelVelocityRef.current *= 0.9;
      const handAngle = wheelAngleRef.current;

      const handSize = Math.hypot(
        x(lm[0].x) - x(lm[9].x),
        y(lm[0].y) - y(lm[9].y),
      );
      const normalizedSize = handSize / 200;
      const radius = (40 + openness * 60) * normalizedSize;
      const numRects = 20;
      const rectHeight = 40;
      const rectWidth = 25;

      if (Math.random() < 0.3) {
        filledSegmentsRef.current = new Map();
        const numFilled = 2 + Math.floor(Math.random() * 6);
        while (filledSegmentsRef.current.size < numFilled) {
          const idx = Math.floor(Math.random() * numRects);
          const color =
            WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)];
          filledSegmentsRef.current.set(idx, color);
        }
      }

      filledSegmentsRef.current.forEach((color, idx) => {
        const current = displayedSegmentsRef.current.get(idx);
        if (!current) {
          displayedSegmentsRef.current.set(idx, { color, alpha: 0 });
        } else {
          displayedSegmentsRef.current.set(idx, {
            color,
            alpha: Math.min(1, current.alpha + 0.08),
          });
        }
      });

      displayedSegmentsRef.current.forEach((val, idx) => {
        if (!filledSegmentsRef.current.has(idx)) {
          if (val.alpha <= 0.01) {
            displayedSegmentsRef.current.delete(idx);
          } else {
            displayedSegmentsRef.current.set(idx, {
              ...val,
              alpha: val.alpha - 0.07,
            });
          }
        }
      });

      for (let i = 0; i < numRects; i++) {
        const angle = (i / numRects) * Math.PI * 2 - handAngle;
        const cx = palm.x + Math.cos(angle) * radius;
        const cy = palm.y + Math.sin(angle) * radius;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2);

        const topW = rectWidth;
        const botW = rectWidth * 0.3;
        const h = rectHeight + openness * 40;
        const r = 4;

        ctx.beginPath();
        ctx.moveTo(-topW / 2 + r, -h / 2);
        ctx.lineTo(topW / 2 - r, -h / 2);
        ctx.arcTo(topW / 2, -h / 2, topW / 2, -h / 2 + r, r);
        ctx.lineTo(botW / 2, h / 2 - r);
        ctx.arcTo(botW / 2, h / 2, botW / 2 - r, h / 2, r);
        ctx.lineTo(-botW / 2 + r, h / 2);
        ctx.arcTo(-botW / 2, h / 2, -botW / 2, h / 2 - r, r);
        ctx.lineTo(-topW / 2, -h / 2 + r);
        ctx.arcTo(-topW / 2, -h / 2, -topW / 2 + r, -h / 2, r);
        ctx.closePath();

        const displayed = displayedSegmentsRef.current.get(i);
        if (displayed) {
          const base = displayed.color.replace(
            /[\d.]+\)$/,
            `${displayed.alpha})`,
          );
          ctx.fillStyle = base;
          ctx.shadowBlur = 40 * displayed.alpha;
          ctx.shadowColor = displayed.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(9, 9, 9, 0.5)";
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.stroke();
        }
        ctx.restore();
      }

      const outerRadius = radius + rectHeight + 45;
      const outerNumRects = 25;
      const outerRectHeight = 75;
      const outerRectWidth = 25;

      if (Math.random() < 0.3) {
        outerFilledSegmentsRef.current = new Map();
        const numFilled = 2 + Math.floor(Math.random() * 6);
        while (outerFilledSegmentsRef.current.size < numFilled) {
          const idx = Math.floor(Math.random() * outerNumRects);
          const color =
            WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)];
          outerFilledSegmentsRef.current.set(idx, color);
        }
      }

      outerFilledSegmentsRef.current.forEach((color, idx) => {
        const current = outerDisplayedSegmentsRef.current.get(idx);
        if (!current) {
          outerDisplayedSegmentsRef.current.set(idx, { color, alpha: 0 });
        } else {
          outerDisplayedSegmentsRef.current.set(idx, {
            color,
            alpha: Math.min(1, current.alpha + 0.08),
          });
        }
      });

      outerDisplayedSegmentsRef.current.forEach((val, idx) => {
        if (!outerFilledSegmentsRef.current.has(idx)) {
          if (val.alpha <= 0.01) {
            outerDisplayedSegmentsRef.current.delete(idx);
          } else {
            outerDisplayedSegmentsRef.current.set(idx, {
              ...val,
              alpha: val.alpha - 0.07,
            });
          }
        }
      });

      for (let i = 0; i < outerNumRects; i++) {
        const angle = (i / outerNumRects) * Math.PI * 2 + handAngle;
        const cx = palm.x + Math.cos(angle) * outerRadius;
        const cy = palm.y + Math.sin(angle) * outerRadius;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2);

        const topW = outerRectWidth;
        const botW = outerRectWidth * 0.5;
        const h = outerRectHeight + openness * 30;
        const r = 4;

        ctx.beginPath();
        ctx.moveTo(-topW / 2 + r, -h / 2);
        ctx.lineTo(topW / 2 - r, -h / 2);
        ctx.arcTo(topW / 2, -h / 2, topW / 2, -h / 2 + r, r);
        ctx.lineTo(botW / 2, h / 2 - r);
        ctx.arcTo(botW / 2, h / 2, botW / 2 - r, h / 2, r);
        ctx.lineTo(-botW / 2 + r, h / 2);
        ctx.arcTo(-botW / 2, h / 2, -botW / 2, h / 2 - r, r);
        ctx.lineTo(-topW / 2, -h / 2 + r);
        ctx.arcTo(-topW / 2, -h / 2, -topW / 2 + r, -h / 2, r);
        ctx.closePath();

        const outerDisplayed = outerDisplayedSegmentsRef.current.get(i);
        if (outerDisplayed) {
          const base = outerDisplayed.color.replace(
            /[\d.]+\)$/,
            `${outerDisplayed.alpha})`,
          );
          ctx.fillStyle = base;
          ctx.shadowBlur = 40 * outerDisplayed.alpha;
          ctx.shadowColor = outerDisplayed.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
          ctx.stroke();
        }

        ctx.restore();
      }
    }
    // rectangle + ascii
    if (landmarks.length >= 2) {
      const left = landmarks[0];
      const right = landmarks[1];

      const pinchL = Math.hypot(left[4].x - left[8].x, left[4].y - left[8].y);
      const pinchR = Math.hypot(
        right[4].x - right[8].x,
        right[4].y - right[8].y,
      );

      const bothPinching = pinchL < 0.04 && pinchR < 0.04;
      if (bothPinching && pinchCooldownRef.current <= 0) {
        rectModeRef.current =
          rectModeRef.current === "ascii" ? "heat" : "ascii";
        pinchCooldownRef.current = 30;
      }
      if (pinchCooldownRef.current > 0) pinchCooldownRef.current--;

      const threshold = 0.08;
      if (pinchL > threshold && pinchR > threshold) {
        const thumbL = { x: x(left[4].x), y: y(left[4].y) };
        const indexL = { x: x(left[8].x), y: y(left[8].y) };
        const thumbR = { x: x(right[4].x), y: y(right[4].y) };
        const indexR = { x: x(right[8].x), y: y(right[8].y) };

        const minX = Math.min(thumbL.x, indexL.x, thumbR.x, indexR.x);
        const maxX = Math.max(thumbL.x, indexL.x, thumbR.x, indexR.x);
        const minY = Math.min(thumbL.y, indexL.y, thumbR.y, indexR.y);
        const maxY = Math.max(thumbL.y, indexL.y, thumbR.y, indexR.y);
        const rectW = maxX - minX;
        const rectH = maxY - minY;

        if (rectW > 10 && rectH > 10) {
          const offscreen = offscreenRef.current;
          const fontSize = 10;
          const cols = Math.floor(rectW / (fontSize * 0.6));
          const rows = Math.floor(rectH / fontSize);

          offscreen.width = cols;
          offscreen.height = rows;
          const offCtx = offscreen.getContext("2d");
          if (!offCtx) return;

          offCtx.save();
          offCtx.scale(-1, 1);
          offCtx.drawImage(
            video,
            ((W - minX - rectW) / scaleX) * video.videoWidth,
            ((minY - offsetY) / scaleY) * video.videoHeight,
            (rectW / scaleX) * video.videoWidth,
            (rectH / scaleY) * video.videoHeight,
            -cols,
            0,
            cols,
            rows,
          );
          offCtx.restore();

          const imageData = offCtx.getImageData(0, 0, cols, rows);

          asciiCtx.save();
          asciiCtx.beginPath();
          asciiCtx.moveTo(thumbL.x, thumbL.y);
          asciiCtx.lineTo(thumbR.x, thumbR.y);
          asciiCtx.lineTo(indexR.x, indexR.y);
          asciiCtx.lineTo(indexL.x, indexL.y);
          asciiCtx.closePath();
          asciiCtx.clip();
          asciiCtx.fillStyle = "#000";
          asciiCtx.fillRect(minX, minY, rectW, rectH);

          if (rectModeRef.current === "ascii") {
            asciiCtx.font = `${fontSize}px monospace`;
            asciiCtx.textBaseline = "top";
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const idx = (row * cols + col) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                const charIdx = Math.floor(
                  brightness * (ASCII_CHARS.length - 1),
                );
                const char = ASCII_CHARS[charIdx];
                const gray = Math.floor(brightness * 255);
                asciiCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
                asciiCtx.fillText(
                  char,
                  minX + col * fontSize * 0.6,
                  minY + row * fontSize,
                );
              }
            }
          } else {
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const idx = (row * cols + col) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                let hr, hg, hb;
                if (brightness < 0.25) {
                  hr = 0;
                  hg = 0;
                  hb = Math.floor(brightness * 4 * 255);
                } else if (brightness < 0.5) {
                  const t = (brightness - 0.25) * 4;
                  hr = Math.floor(t * 255);
                  hg = 0;
                  hb = Math.floor((1 - t) * 255);
                } else if (brightness < 0.75) {
                  const t = (brightness - 0.5) * 4;
                  hr = 255;
                  hg = Math.floor(t * 255);
                  hb = 0;
                } else {
                  const t = (brightness - 0.75) * 4;
                  hr = 255;
                  hg = 255;
                  hb = Math.floor(t * 255);
                }
                asciiCtx.fillStyle = `rgb(${hr},${hg},${hb})`;
                asciiCtx.fillRect(
                  minX + col * fontSize * 0.6,
                  minY + row * fontSize,
                  fontSize * 0.6,
                  fontSize,
                );
              }
            }
          }

          asciiCtx.restore();

          // glitch chromatic aberration
          if (Math.random() < 0.15) {
            const glitchSlices = 3 + Math.floor(Math.random() * 4);
            for (let s = 0; s < glitchSlices; s++) {
              const sliceY = minY + Math.random() * rectH;
              const sliceH = 2 + Math.random() * 12;
              const offsetX = (Math.random() - 0.5) * 20;

              // red channel shift
              asciiCtx.save();
              asciiCtx.globalCompositeOperation = "screen";
              asciiCtx.globalAlpha = 0.4;
              asciiCtx.drawImage(
                asciiCanvas,
                minX,
                sliceY,
                rectW,
                sliceH,
                minX + offsetX,
                sliceY,
                rectW,
                sliceH,
              );
              asciiCtx.restore();

              // blue channel shift opposite
              asciiCtx.save();
              asciiCtx.globalCompositeOperation = "screen";
              asciiCtx.globalAlpha = 0.3;
              asciiCtx.drawImage(
                asciiCanvas,
                minX,
                sliceY,
                rectW,
                sliceH,
                minX - offsetX * 0.5,
                sliceY,
                rectW,
                sliceH,
              );
              asciiCtx.restore();
            }
          }
        }
      }
    }
  }, [landmarks]);

  return (
    <>
      <video
        ref={videoRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          transform: "scaleX(-1)",
          zIndex: 0,
        }}
        playsInline
        muted
      />
      <canvas
        ref={asciiCanvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          color: "lime",
          fontFamily: "monospace",
          fontSize: 12,
          zIndex: 100,
          background: "rgba(0,0,0,0.5)",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <div>tracking: {isTracking ? "✅" : "❌"}</div>
        <div>rotation: {rotation.toFixed(2)}°</div>
        <div>openness: {openness.toFixed(4)}</div>
        <div>velocity: {velocity.toFixed(4)}</div>
        <div>depth: {depth.toFixed(4)}</div>
      </div>
    </>
  );
};

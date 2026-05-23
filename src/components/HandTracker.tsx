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
];

export const HandTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(
    document.createElement("canvas"),
  );
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

    // draw all hands
    landmarks.forEach((lm) => {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0, 255, 200, 0.6)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ffcc";

      CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(x(lm[a].x), y(lm[a].y));
        ctx.lineTo(x(lm[b].x), y(lm[b].y));
        ctx.stroke();
      });

      lm.forEach((point, i) => {
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 8 : 5;
        ctx.beginPath();
        ctx.arc(x(point.x), y(point.y), radius, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? "#ff00aa" : "#00ffcc";
        ctx.shadowBlur = 20;
        ctx.shadowColor = isTip ? "#ff00aa" : "#00ffcc";
        ctx.fill();
      });
    });

    // rectangle + ascii
    if (landmarks.length === 2) {
      const left = landmarks[0];
      const right = landmarks[1];

      const pinchL = Math.hypot(left[4].x - left[8].x, left[4].y - left[8].y);
      const pinchR = Math.hypot(
        right[4].x - right[8].x,
        right[4].y - right[8].y,
      );
      const threshold = 0.08;

      if (pinchL > threshold && pinchR > threshold) {
        const thumbL = { x: x(left[4].x), y: y(left[4].y) };
        const indexL = { x: x(left[8].x), y: y(left[8].y) };
        const thumbR = { x: x(right[4].x), y: y(right[4].y) };
        const indexR = { x: x(right[8].x), y: y(right[8].y) };

        // bounding box of the 4 points
        const minX = Math.min(thumbL.x, indexL.x, thumbR.x, indexR.x);
        const maxX = Math.max(thumbL.x, indexL.x, thumbR.x, indexR.x);
        const minY = Math.min(thumbL.y, indexL.y, thumbR.y, indexR.y);
        const maxY = Math.max(thumbL.y, indexL.y, thumbR.y, indexR.y);
        const rectW = maxX - minX;
        const rectH = maxY - minY;

        if (rectW > 10 && rectH > 10) {
          // sample video pixels inside the rect
          const offscreen = offscreenRef.current;
          const fontSize = 10;
          const cols = Math.floor(rectW / (fontSize * 0.6));
          const rows = Math.floor(rectH / fontSize);

          offscreen.width = cols;
          offscreen.height = rows;
          const offCtx = offscreen.getContext("2d");
          if (!offCtx) return;

          // flip horizontally to match mirrored video
          offCtx.save();
          offCtx.scale(-1, 1);
          offCtx.drawImage(
            video,
            // source from video
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

          // clip to rectangle shape
          asciiCtx.save();
          asciiCtx.beginPath();
          asciiCtx.moveTo(thumbL.x, thumbL.y);
          asciiCtx.lineTo(thumbR.x, thumbR.y);
          asciiCtx.lineTo(indexR.x, indexR.y);
          asciiCtx.lineTo(indexL.x, indexL.y);
          asciiCtx.closePath();
          asciiCtx.clip();

          // black background inside rect
          asciiCtx.fillStyle = "#000";
          asciiCtx.fillRect(minX, minY, rectW, rectH);

          // draw ascii
          asciiCtx.font = `${fontSize}px monospace`;
          asciiCtx.textBaseline = "top";

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const idx = (row * cols + col) * 4;
              const r = imageData.data[idx];
              const g = imageData.data[idx + 1];
              const b = imageData.data[idx + 2];
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              const charIdx = Math.floor(brightness * (ASCII_CHARS.length - 1));
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

          asciiCtx.restore();

          // draw rectangle border
          ctx.beginPath();
          ctx.moveTo(thumbL.x, thumbL.y);
          ctx.lineTo(thumbR.x, thumbR.y);
          ctx.lineTo(indexR.x, indexR.y);
          ctx.lineTo(indexL.x, indexL.y);
          ctx.closePath();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#ffffff";
          ctx.stroke();
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

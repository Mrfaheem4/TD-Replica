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
  const videoRef = useRef<HTMLVideoElement>(null);
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

    // draw all hands
    // landmarks.forEach((lm) => {
    //   ctx.lineWidth = 2;
    //   ctx.strokeStyle = "rgba(0, 255, 200, 0.6)";
    //   ctx.shadowBlur = 10;
    //   ctx.shadowColor = "#00ffcc";

    //   CONNECTIONS.forEach(([a, b]) => {
    //     ctx.beginPath();
    //     ctx.moveTo(x(lm[a].x), y(lm[a].y));
    //     ctx.lineTo(x(lm[b].x), y(lm[b].y));
    //     ctx.stroke();
    //   });

    //   lm.forEach((point, i) => {
    //     const isTip = [4, 8, 12, 16, 20].includes(i);
    //     const radius = isTip ? 8 : 5;
    //     ctx.beginPath();
    //     ctx.arc(x(point.x), y(point.y), radius, 0, Math.PI * 2);
    //     ctx.fillStyle = isTip ? "#ff00aa" : "#00ffcc";
    //     ctx.shadowBlur = 20;
    //     ctx.shadowColor = isTip ? "#ff00aa" : "#00ffcc";
    //     ctx.fill();
    //   });
    // });

    // Circlular Rings

    if (landmarks.length >= 1) {
      const lm = landmarks[0];
      const palm = { x: x(lm[9].x), y: y(lm[9].y) };

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
      const radius = (40 + openness * 180) * normalizedSize;
      const numRects = 20;
      const rectHeight = 80;
      const rectWidth = 30;

      // regenerate filled segments occasionally — store color with segment
      if (Math.random() < 0.05) {
        filledSegmentsRef.current = new Map();
        const colors = [
          "rgba(255, 20, 147, 0.9)",
          "rgba(255, 215, 0, 0.9)",
          "rgba(255, 105, 180, 0.8)",
          "rgba(255, 180, 0, 0.8)",
          "rgba(13, 54, 234, 0.8)",
          "rgba(222, 19, 19, 0.8)",
        ];
        const numFilled = 4 + Math.floor(Math.random() * 6);
        while (filledSegmentsRef.current.size < numFilled) {
          const idx = Math.floor(Math.random() * numRects);
          const color = colors[Math.floor(Math.random() * colors.length)];
          filledSegmentsRef.current.set(idx, color);
        }
      }
      // regenerate target segments
      if (Math.random() < 0.3) {
        const colors = [
          "rgba(255, 20, 147, 0.9)",
          "rgba(255, 215, 0, 0.9)",
          "rgba(255, 105, 180, 0.8)",
          "rgba(255, 180, 0, 0.8)",
          "rgba(13, 54, 234, 0.8)",
          "rgba(222, 19, 19, 0.8)",
        ];
        filledSegmentsRef.current = new Map();
        const numFilled = 2 + Math.floor(Math.random() * 6);
        while (filledSegmentsRef.current.size < numFilled) {
          const idx = Math.floor(Math.random() * numRects);
          const color = colors[Math.floor(Math.random() * colors.length)];
          filledSegmentsRef.current.set(idx, color);
        }
      }

      // fade displayed segments toward target
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

      // fade out segments no longer in target
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

        ctx.beginPath();
        ctx.moveTo(-topW / 2, -h / 2);
        ctx.lineTo(topW / 2, -h / 2);
        ctx.lineTo(botW / 2, h / 2);
        ctx.lineTo(-botW / 2, h / 2);
        ctx.closePath();

        const displayed = displayedSegmentsRef.current.get(i);
        if (displayed) {
          const base = displayed.color.replace(
            /[\d.]+\)$/,
            `${displayed.alpha})`,
          );
          ctx.fillStyle = base;
          ctx.shadowBlur = 20 * displayed.alpha;
          ctx.shadowColor = displayed.color;
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

      // outer ring  opposite rotation
      const outerRadius = radius + rectHeight + 20;
      const outerNumRects = 24;
      const outerRectHeight = 60;
      const outerRectWidth = 20;

      for (let i = 0; i < outerNumRects; i++) {
        const angle = (i / outerNumRects) * Math.PI * 2 + handAngle; // + instead of -

        const cx = palm.x + Math.cos(angle) * outerRadius;
        const cy = palm.y + Math.sin(angle) * outerRadius;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2);

        const topW = outerRectWidth;
        const botW = outerRectWidth * 0.7;
        const h = outerRectHeight + openness * 30;

        ctx.beginPath();
        ctx.moveTo(-topW / 2, -h / 2);
        ctx.lineTo(topW / 2, -h / 2);
        ctx.lineTo(botW / 2, h / 2);
        ctx.lineTo(-botW / 2, h / 2);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.stroke();

        ctx.restore();
      }
    }

    // // rectangle + ascii
    // if (landmarks.length === 2) {
    //   const left = landmarks[0];
    //   const right = landmarks[1];

    //   const pinchL = Math.hypot(left[4].x - left[8].x, left[4].y - left[8].y);
    //   const pinchR = Math.hypot(
    //     right[4].x - right[8].x,
    //     right[4].y - right[8].y,
    //   );
    //   const threshold = 0.08;

    //   if (pinchL > threshold && pinchR > threshold) {
    //     const thumbL = { x: x(left[4].x), y: y(left[4].y) };
    //     const indexL = { x: x(left[8].x), y: y(left[8].y) };
    //     const thumbR = { x: x(right[4].x), y: y(right[4].y) };
    //     const indexR = { x: x(right[8].x), y: y(right[8].y) };

    //     // bounding box of the 4 points
    //     const minX = Math.min(thumbL.x, indexL.x, thumbR.x, indexR.x);
    //     const maxX = Math.max(thumbL.x, indexL.x, thumbR.x, indexR.x);
    //     const minY = Math.min(thumbL.y, indexL.y, thumbR.y, indexR.y);
    //     const maxY = Math.max(thumbL.y, indexL.y, thumbR.y, indexR.y);
    //     const rectW = maxX - minX;
    //     const rectH = maxY - minY;

    //     if (rectW > 10 && rectH > 10) {
    //       // sample video pixels inside the rect
    //       const offscreen = offscreenRef.current;
    //       const fontSize = 10;
    //       const cols = Math.floor(rectW / (fontSize * 0.6));
    //       const rows = Math.floor(rectH / fontSize);

    //       offscreen.width = cols;
    //       offscreen.height = rows;
    //       const offCtx = offscreen.getContext("2d");
    //       if (!offCtx) return;

    //       // flip horizontally to match mirrored video
    //       offCtx.save();
    //       offCtx.scale(-1, 1);
    //       offCtx.drawImage(
    //         video,
    //         // source from video
    //         ((W - minX - rectW) / scaleX) * video.videoWidth,
    //         ((minY - offsetY) / scaleY) * video.videoHeight,
    //         (rectW / scaleX) * video.videoWidth,
    //         (rectH / scaleY) * video.videoHeight,
    //         -cols,
    //         0,
    //         cols,
    //         rows,
    //       );
    //       offCtx.restore();

    //       const imageData = offCtx.getImageData(0, 0, cols, rows);

    //       // clip to rectangle shape
    //       asciiCtx.save();
    //       asciiCtx.beginPath();
    //       asciiCtx.moveTo(thumbL.x, thumbL.y);
    //       asciiCtx.lineTo(thumbR.x, thumbR.y);
    //       asciiCtx.lineTo(indexR.x, indexR.y);
    //       asciiCtx.lineTo(indexL.x, indexL.y);
    //       asciiCtx.closePath();
    //       asciiCtx.clip();

    //       // black background inside rect
    //       asciiCtx.fillStyle = "#000";
    //       asciiCtx.fillRect(minX, minY, rectW, rectH);

    //       // draw ascii
    //       asciiCtx.font = `${fontSize}px monospace`;
    //       asciiCtx.textBaseline = "top";

    //       for (let row = 0; row < rows; row++) {
    //         for (let col = 0; col < cols; col++) {
    //           const idx = (row * cols + col) * 4;
    //           const r = imageData.data[idx];
    //           const g = imageData.data[idx + 1];
    //           const b = imageData.data[idx + 2];
    //           const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    //           const charIdx = Math.floor(brightness * (ASCII_CHARS.length - 1));
    //           const char = ASCII_CHARS[charIdx];
    //           const gray = Math.floor(brightness * 255);
    //           asciiCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
    //           asciiCtx.fillText(
    //             char,
    //             minX + col * fontSize * 0.6,
    //             minY + row * fontSize,
    //           );
    //         }
    //       }

    //       asciiCtx.restore();
    //     }
    //   }
    // }
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

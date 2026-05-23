import { useEffect, useRef, type RefObject } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useHandStore } from "../store/handStore";

export const useHandTracking = (
  videoRef: RefObject<HTMLVideoElement | null>,
) => {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const setHandData = useHandStore((s) => s.setHandData);

  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
      );
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadeddata = () => detect();
      }
    };

    const detect = () => {
      if (!landmarkerRef.current || !videoRef.current) return;

      const results = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now(),
      );

      if (results.landmarks.length > 0) {
        const allLandmarks = results.landmarks;
        const lm = allLandmarks[0];
        const wrist = lm[0];
        const middleBase = lm[9];

        const rotation =
          Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x) *
          (180 / Math.PI);

        const tips = [4, 8, 12, 16, 20];
        const openness =
          tips.reduce((acc, i) => {
            return acc + Math.hypot(lm[i].x - wrist.x, lm[i].y - wrist.y);
          }, 0) / tips.length;

        const velocity = Math.hypot(
          lm[0].x - lastPosRef.current.x,
          lm[0].y - lastPosRef.current.y,
        );
        lastPosRef.current = { x: lm[0].x, y: lm[0].y };

        const depth = Math.abs(wrist.z);

        setHandData({
          landmarks: allLandmarks,
          rotation,
          openness,
          velocity,
          depth,
          isTracking: true,
        });
      } else {
        setHandData({ isTracking: false, landmarks: [] });
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    init();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);
};

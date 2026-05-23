import { create } from "zustand";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface HandState {
  landmarks: Landmark[][];
  rotation: number;
  openness: number;
  velocity: number;
  depth: number;
  isTracking: boolean;
  setHandData: (data: Partial<HandState>) => void;
}

export const useHandStore = create<HandState>((set) => ({
  landmarks: [],
  rotation: 0,
  openness: 0,
  velocity: 0,
  depth: 0,
  isTracking: false,
  setHandData: (data) => set((state) => ({ ...state, ...data })),
}));

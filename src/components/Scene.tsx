import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Mesh } from "three";
import { useHandStore } from "../store/handStore";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Vector2 } from "three";

const HandMesh = () => {
  const meshRef = useRef<Mesh>(null);
  const { rotation, openness, velocity, isTracking } = useHandStore();

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // rotate based on hand rotation
    meshRef.current.rotation.z = (rotation * Math.PI) / 180;
    meshRef.current.rotation.x += delta * 0.5;

    // scale based on openness
    const scale = isTracking ? 0.5 + openness * 3 : 1;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial
        color="#00ffcc"
        wireframe
        emissive="#00ffcc"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

export const Scene = () => {
  return (
    <Canvas
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2,
        pointerEvents: "none",
      }}
      camera={{ position: [0, 0, 5] }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <HandMesh />
      <EffectComposer>
        <Bloom
          intensity={2}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
        />
        <ChromaticAberration offset={new Vector2(0.002, 0.002)} />
      </EffectComposer>
    </Canvas>
  );
};

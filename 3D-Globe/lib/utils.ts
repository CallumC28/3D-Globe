import * as THREE from "three";

export function animateCameraTo(
  camera: THREE.PerspectiveCamera,
  controls: any,
  target: THREE.Vector3,
  distance = 6,
  durationMs = 900
) {
  const startPos = camera.position.clone();
  const startTarget = (controls.target as THREE.Vector3).clone();

  const endTarget = target.clone().normalize().multiplyScalar(0);
  const endPos = target.clone().normalize().multiplyScalar(distance);

  const start = performance.now();

  const tick = () => {
    const now = performance.now();
    const t = Math.min(1, (now - start) / durationMs);
    const ease = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    camera.lookAt(controls.target);
    controls.update();

    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

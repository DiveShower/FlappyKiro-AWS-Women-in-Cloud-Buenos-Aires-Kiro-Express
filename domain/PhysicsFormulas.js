// domain/PhysicsFormulas.js

/** REQ-PHY-003  velocity_y += GRAVITY * dt */
export function integrateGravity(velocityY, gravity, dt) {
  return velocityY + gravity * dt;
}

/** REQ-PHY-008  clamp to terminal velocity */
export function clampToTerminal(velocityY, terminalVelocity) {
  return Math.min(velocityY, terminalVelocity);
}

/** REQ-PHY-010  position_y += velocity_y * dt */
export function integratePosition(positionY, velocityY, dt) {
  return positionY + velocityY * dt;
}

/** REQ-PHY-012  rotation = clamp(velocity_y * TILT_FACTOR, -25, 90) */
export function calcTargetRotation(velocityY, tiltFactor) {
  const raw = velocityY * tiltFactor;
  return Math.max(-25, Math.min(90, raw));
}

/** REQ-PHY-013  lerp toward target rotation */
export function lerpRotation(current, target, smoothing) {
  return current + (target - current) * smoothing;
}

/** REQ-CDT-001  hitbox dimensions — centered on sprite origin */
export function calcHitbox(x, y, spriteW, spriteH, scaleX, scaleY) {
  const w = spriteW * scaleX;
  const h = spriteH * scaleY;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/** AABB intersection test — REQ-CDT-004 */
export function aabbIntersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

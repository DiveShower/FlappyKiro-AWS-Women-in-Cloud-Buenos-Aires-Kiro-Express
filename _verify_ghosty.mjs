import { createGhostyState } from './domain/GhostyState.js';

const s = createGhostyState();
const fields = ['x', 'y', 'velocityY', 'rotation', 'iFrameTimer', 'shieldActive'];
const allFields = fields.every(f => f in s);
console.log('AC1 — all 6 fields present:', allFields);
console.log('AC2 — Object.isFrozen:', Object.isFrozen(s));
console.log('AC3 — y override (expected 100):', createGhostyState({ y: 100 }).y === 100);
console.log('defaults — x=120:', s.x === 120);
console.log('defaults — y=250:', s.y === 250);
console.log('defaults — velocityY=0:', s.velocityY === 0);
console.log('defaults — rotation=0:', s.rotation === 0);
console.log('defaults — iFrameTimer=0:', s.iFrameTimer === 0);
console.log('defaults — shieldActive=false:', s.shieldActive === false);

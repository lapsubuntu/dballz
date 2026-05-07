

import { state } from './state.js';
import { Particle, TeleportLine } from './particle.js';

export function spawnExplosion(x, y, color, count, speedMult = 1) {
    for (let i = 0; i < count; i++) {
        state.particles.push(new Particle(x, y, color, speedMult));
    }
}

export function spawnTeleportLines(x, y, color) {
    for (let i = 0; i < 8; i++) {
        state.particles.push(new TeleportLine(x, y, color));
    }
}
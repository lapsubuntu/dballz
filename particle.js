import { Vector } from './vector.js';

export class Particle {
    constructor(x, y, color, speedMultiplier = 1) {
        this.pos = new Vector(x, y);
        let angle = Math.random() * Math.PI * 2;
        let speed = (Math.random() * 4 + 2) * speedMultiplier;
        
        this.vel = new Vector(Math.cos(angle), Math.sin(angle)).mult(speed);
        this.color = color;
        
        this.life = 1.0; 
        this.decay = Math.random() * 0.03 + 0.02;
        this.size = Math.random() * 6 + 3;
    }

    update() {
        this.pos.add(this.vel);
        this.vel.mult(0.92); 
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1.0;
    }
}

export class AfterImage {
    constructor(x, y, radius, color, isFlashing) {
        this.pos = new Vector(x, y);
        this.radius = radius;
        this.color = color;
        this.isFlashing = isFlashing;
        this.life = 0.6; 
        this.decay = 0.04;
    }

    update() {
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isFlashing ? '#FFFFFF' : this.color;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1.0;
    }
}

export class TeleportLine {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 12 + 6;
        this.length = Math.random() * 50 + 20;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.1; 
    }
    update() {
        this.pos.x += Math.cos(this.angle) * this.speed;
        this.pos.y += Math.sin(this.angle) * this.speed;
        this.life -= this.decay;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = '#FFFFFF'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x - Math.cos(this.angle) * this.length, this.pos.y - Math.sin(this.angle) * this.length);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

export class KiBlast {
    constructor(x, y, dirVec, color, isPlayer) {
        this.pos = new Vector(x, y);
        this.vel = dirVec.copy().normalize().mult(18); 
        this.color = color;
        this.isPlayer = isPlayer;
        this.radius = 8;
        this.life = 80; 
    }
    update() {
        this.pos.add(this.vel);
        this.life--;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }
}

// NEW: Traveling Energy Beam & Clash Support
export class EnergyBeam {
    constructor(brawler) {
        this.brawler = brawler;
        this.life = 60; // How many frames it lasts
        this.width = 40; // Total width
        
        this.maxLength = 1500; 
        this.currentLength = 0; // Starts at 0
        this.travelSpeed = 45; // Travels quickly
        
        this.color = brawler.color;
        this.active = true;
        this.clashPoint = null;
    }
    
    getStartPos() {
        return Vector.add(this.brawler.pos, this.brawler.lookDir.copy().mult(this.brawler.radius));
    }

    getRawEndPos() {
        return Vector.add(this.getStartPos(), this.brawler.lookDir.copy().mult(this.currentLength));
    }

    getActualEndPos() {
        if (this.clashPoint) return this.clashPoint;
        return this.getRawEndPos();
    }

    update() {
        this.life--;
        if (this.life <= 0) this.active = false;
        
        // Extend the beam length each frame
        this.currentLength = Math.min(this.maxLength, this.currentLength + this.travelSpeed);
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        let startPos = this.getStartPos();
        let endPos = this.getActualEndPos();

        ctx.save();
        
        // Outer aura
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.lineWidth = this.width + (Math.random() * 10 - 5);
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner bright core
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.lineWidth = this.width * 0.4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.shadowBlur = 0;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    }
    
    checkCollision(target) {
        if (!this.active || this.life % 6 !== 0) return false;

        let start = this.getStartPos();
        let lineDir = this.brawler.lookDir.copy();
        let toTarget = Vector.sub(target.pos, start);
        
        let projection = toTarget.dot(lineDir);
        let actualVisualLength = this.clashPoint ? Vector.dist(start, this.clashPoint) : this.currentLength;

        // Check if the target is within the CURRENT visible segment of the line
        if (projection > 0 && projection < actualVisualLength) {
            let closestPoint = Vector.add(start, lineDir.mult(projection));
            let dist = Vector.dist(target.pos, closestPoint);
            
            if (dist < target.radius + this.width / 2) {
                return true;
            }
        }
        return false;
    }
}
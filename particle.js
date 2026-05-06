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

export class HomingKiBlast {
    constructor(x, y, dirVec, color, isPlayer, target) {
        this.pos = new Vector(x, y);
        this.vel = dirVec.copy().normalize().mult(12); // Slightly slower for homing
        this.color = color;
        this.isPlayer = isPlayer;
        this.target = target;
        this.radius = 6;
        this.life = 120; 
    }
    update() {
        if (this.target && !this.target.isDead) {
            let toTarget = Vector.sub(this.target.pos, this.pos).normalize();
            this.vel.add(toTarget.mult(0.8)); // Steer towards target
            this.vel.limit(14); // Max speed cap
        }
        this.pos.add(this.vel);
        this.life--;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        let tail = Vector.sub(this.pos, this.vel.copy().mult(1.5));
        ctx.lineTo(tail.x, tail.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

export class KiBall {
    constructor(x, y, dirVec, color, isPlayer) {
        this.pos = new Vector(x, y);
        this.vel = dirVec.copy().normalize().mult(6); // Slow moving
        this.color = color;
        this.isPlayer = isPlayer;
        this.radius = 25;
        this.life = 200; 
    }
    update() {
        this.pos.add(this.vel);
        this.life--;
    }
    draw(ctx) {
        let pulse = Math.sin(Date.now() / 80) * 4;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

export class KiGrenade {
    constructor(x, y, dirVec, color, isPlayer) {
        this.pos = new Vector(x, y);
        
        // Tighter forward cone so they surround the enemy better
        let spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6; 
        let baseDir = dirVec.copy().rotate(spreadAngle);
        
        // Faster initial burst to travel further
        let speed = Math.random() * 15 + 12;
        
        this.vel = baseDir.mult(speed); 
        this.color = color;
        this.isPlayer = isPlayer;
        this.radius = 6;
        this.life = 300; 
        this.active = true;
    }
    update() {
        this.pos.add(this.vel);
        // Slightly lower friction so they scatter deeper into the arena
        this.vel.mult(0.92); 
        this.life--;
        if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
        if (!this.active) return;
        let pulse = Math.sin(Date.now() / 100) * 2;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

export class EnergyBeam {
    constructor(brawler) {
        this.brawler = brawler;
        this.life = 60; 
        this.width = 40; 
        
        this.maxLength = 1500; 
        this.currentLength = 0; 
        this.travelSpeed = 45; 
        
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
        
        this.currentLength = Math.min(this.maxLength, this.currentLength + this.travelSpeed);
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        let startPos = this.getStartPos();
        let endPos = this.getActualEndPos();

        ctx.save();
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.lineWidth = this.width + (Math.random() * 10 - 5);
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.lineCap = 'round';
        ctx.stroke();

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
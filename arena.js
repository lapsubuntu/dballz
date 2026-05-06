import { Vector } from './vector.js';

export class Obstacle {
    constructor(x, y, type) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.type = type;
        this.isDead = false;

        this.seed = Math.random();

        if (type === 'rock') {
            this.radius = 15 + Math.random() * 20;
            this.mass = this.radius * 0.15; 
            this.maxHealth = this.radius * 3;
            this.isStatic = false;
            this.color = '#c2b280'; 
            this.height = 0;
        } else if (type === 'pillar') {
            // Increased variance in pillar size
            this.radius = 20 + Math.random() * 25;
            this.mass = 999; 
            this.maxHealth = 120 + Math.random() * 80;
            this.isStatic = true;
            this.color = '#a08a58';
            this.height = 40 + Math.random() * 50;
            
            this.falling = false;
            this.fallTimer = 0;
            this.fallDir = new Vector(0, 1);
        }
        
        this.health = this.maxHealth;
    }

    takeDamage(amt, knockbackVec) {
        this.health -= amt;
        
        if (this.health <= 0 && !this.isDead) {
            if (this.type === 'pillar' && !this.falling) {
                this.falling = true;
                this.fallTimer = 30; 
                if (knockbackVec && knockbackVec.mag() > 0.1) {
                    this.fallDir = knockbackVec.copy().normalize();
                } else {
                    this.fallDir = new Vector((Math.random() - 0.5), (Math.random() - 0.5)).normalize();
                }
            } else if (this.type === 'rock') {
                this.isDead = true;
            }
        } else if (this.type === 'rock' && knockbackVec && !this.isStatic) {
            this.vel.add(knockbackVec.copy().mult(1 / this.mass));
        }
    }

    update(boundsWidth, boundsHeight) {
        if (this.falling) {
            this.fallTimer--;
            this.height *= 0.85; 
            if (this.fallTimer <= 0) {
                this.isDead = true;
            }
        }

        if (!this.isStatic) {
            this.pos.add(this.vel);
            this.vel.mult(0.85); 

            if (this.pos.x < this.radius) { this.pos.x = this.radius; this.vel.x *= -0.5; }
            if (this.pos.x > boundsWidth - this.radius) { this.pos.x = boundsWidth - this.radius; this.vel.x *= -0.5; }
            if (this.pos.y < this.radius) { this.pos.y = this.radius; this.vel.y *= -0.5; }
            if (this.pos.y > boundsHeight - this.radius) { this.pos.y = boundsHeight - this.radius; this.vel.y *= -0.5; }
        }
    }

    // Helper method to draw a consistent jagged rocky shape
    buildShapePath(ctx, cx, cy, r) {
        let jaggedness = this.type === 'pillar' ? r * 0.15 : r * 0.2;
        ctx.beginPath();
        for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
            // Seed guarantees the exact same rock/pillar edges for all its layers
            let rOffset = r + Math.sin(i * 3 + this.seed * 10) * jaggedness;
            let rx = cx + Math.cos(i) * rOffset;
            let ry = cy + Math.sin(i) * rOffset;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
    }

    draw(ctx) {
        if (this.type === 'pillar') {
            // Base shadow
            this.buildShapePath(ctx, this.pos.x, this.pos.y, this.radius);
            ctx.fillStyle = '#4a3b22';
            ctx.fill();

            // Fake 3D Projection Layers extruding the rock shape upwards
            let layers = 6;
            for (let i = 1; i <= layers; i++) {
                let hOffset = (this.height / layers) * i;
                
                let fallOffsetX = this.falling ? this.fallDir.x * (30 - this.fallTimer) * (i / layers) : 0;
                let fallOffsetY = this.falling ? this.fallDir.y * (30 - this.fallTimer) * (i / layers) : 0;
                
                let layerY = this.pos.y - hOffset + fallOffsetY;
                let layerX = this.pos.x + fallOffsetX;

                this.buildShapePath(ctx, layerX, layerY, this.radius);
                
                let lightness = 25 + (i / layers) * 35;
                ctx.fillStyle = `hsl(40, 30%, ${lightness}%)`;
                ctx.fill();
                
                ctx.strokeStyle = `hsl(40, 30%, ${lightness - 15}%)`;
                ctx.lineWidth = 2;
                ctx.stroke();

                if (i === layers && this.health < this.maxHealth * 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(layerX - this.radius * 0.5, layerY);
                    ctx.lineTo(layerX + this.radius * 0.2, layerY + this.radius * 0.4);
                    ctx.lineTo(layerX + this.radius * 0.6, layerY - this.radius * 0.3);
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            }
        } else if (this.type === 'rock') {
            this.buildShapePath(ctx, this.pos.x, this.pos.y, this.radius);
            let damageRatio = Math.max(0, this.health / this.maxHealth);
            ctx.fillStyle = `hsl(40, 30%, ${30 + damageRatio * 20}%)`;
            ctx.fill();
            
            ctx.strokeStyle = '#4a3b22';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

export class Arena {
    constructor(theme, width, height) {
        this.theme = theme;
        this.width = width;
        this.height = height;
        this.obstacles =[];
        this.bgCanvas = null; 
        this.generate();
    }

    generate() {
        this.obstacles =[];
        if (this.theme === 'Desert') {
            this.generateSandBackground();

            let numRocks = 6 + Math.floor(Math.random() * 5);
            for(let i = 0; i < numRocks; i++) {
                let rx = 100 + Math.random() * (this.width - 200);
                let ry = 100 + Math.random() * (this.height - 200);
                this.obstacles.push(new Obstacle(rx, ry, 'rock'));
            }

            let numPillars = 4 + Math.floor(Math.random() * 4);
            for(let i = 0; i < numPillars; i++) {
                let rx = 150 + Math.random() * (this.width - 300);
                let ry = 150 + Math.random() * (this.height - 300);
                this.obstacles.push(new Obstacle(rx, ry, 'pillar'));
            }
        }
    }

    generateSandBackground() {
        // Render detailed soft noise and dunes once on an off-screen canvas for high performance
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        let bctx = this.bgCanvas.getContext('2d');

        // Base color
        bctx.fillStyle = '#e8d2a5';
        bctx.fillRect(0, 0, this.width, this.height);

        // Generate Wavy Layered Dunes
        let numDunes = 12;
        let baseHues = [40, 42, 38, 39, 41]; // Desert sand hues

        for (let i = 0; i < numDunes; i++) {
            // Distribute dunes from top to bottom
            let baseY = (this.height / numDunes) * i - 50; 
            let amplitude = 70 + Math.random() * 60;
            let frequency = 0.0015 + Math.random() * 0.002; // Very wide sweeping waves
            let phase = Math.random() * Math.PI * 2;
            
            bctx.beginPath();
            bctx.moveTo(0, this.height); // Start filling from bottom
            
            // Draw the top crest line of the dune across the canvas
            for (let x = 0; x <= this.width + 20; x += 20) {
                // Mix two sine waves for more natural-looking peaks and valleys
                let y = baseY 
                      + Math.sin(x * frequency + phase) * amplitude 
                      + Math.sin(x * frequency * 2.1 + phase * 1.5) * (amplitude * 0.3);
                
                bctx.lineTo(x, y);
            }
            
            // Complete the shape downwards to fill it in
            bctx.lineTo(this.width, this.height);
            bctx.lineTo(0, this.height);
            bctx.closePath();

            // Pick slight variations of sand color for depth
            let hue = baseHues[i % baseHues.length];
            let sat = 35 + Math.random() * 10;
            let lit = 60 + Math.random() * 15;
            bctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
            bctx.fill();

            // Dune ridge shadow (simulates the crest dropping off downwards)
            bctx.lineWidth = 8;
            bctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit - 15}%, 0.4)`;
            bctx.stroke();
            
            // Dune ridge highlight (the side catching the sun)
            bctx.lineWidth = 2;
            bctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit + 20}%, 0.5)`;
            bctx.stroke();
        }

        // Fine sand grain textures (reduced amount so it texturizes the dunes rather than overriding them)
        bctx.globalAlpha = 0.06;
        for (let i = 0; i < 4000; i++) {
            let x = Math.random() * this.width;
            let y = Math.random() * this.height;
            bctx.fillStyle = Math.random() > 0.5 ? '#5c4a2e' : '#ffffff';
            bctx.fillRect(x, y, 2, 2);
        }

        // Center Arena marking
        bctx.globalAlpha = 1.0;
        bctx.strokeStyle = 'rgba(160, 138, 88, 0.4)';
        bctx.lineWidth = 4;
        bctx.beginPath();
        bctx.arc(this.width / 2, this.height / 2, 150, 0, Math.PI * 2);
        bctx.stroke();
        
        // Inner Arena circle marking
        bctx.beginPath();
        bctx.arc(this.width / 2, this.height / 2, 140, 0, Math.PI * 2);
        bctx.lineWidth = 1;
        bctx.stroke();
    }

    update() {
        this.obstacles.forEach(obs => obs.update(this.width, this.height));
        this.obstacles = this.obstacles.filter(obs => !obs.isDead);
    }

    draw(ctx) {
        if (this.theme === 'Desert' && this.bgCanvas) {
            // Draw the pre-calculated noise background
            ctx.drawImage(this.bgCanvas, 0, 0);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        let sortedObstacles = [...this.obstacles].sort((a, b) => a.pos.y - b.pos.y);
        sortedObstacles.forEach(obs => obs.draw(ctx));
    }
}
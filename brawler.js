import { Vector } from './vector.js';
import { RACES } from './races.js';
import { AfterImage } from './particle.js';

export class Brawler {
    constructor(x, y, color, isPlayer = false, style = 'Quick Fist', raceName = 'Human') {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        
        this.lookDir = new Vector(1, 0); 
        this.lookTarget = null;
        
        this.radius = 20;
        this.color = color;
        this.isPlayer = isPlayer;
        this.style = style;
        this.raceName = raceName;

        this.raceData = RACES[raceName];

        this.baseMaxHealth = 45;
        this.baseMaxSpeed = 7.0; 
        this.baseDamage = 2;
        this.baseKnockback = 18;
        
        if (style === 'Quick Fist') {
            this.baseMaxHealth = 35;
            this.baseMaxSpeed = 9.5;       
            this.baseDamage = 0.8;           
            this.baseKnockback = 10;        
            this.attackCooldown = 6;   
            this.iframeDuration = 5;   
            this.dodgeCooldownBase = 15;
            this.baseBlockCooldown = 15;
        } else if (style === 'Pummel') {
            this.baseMaxHealth = 65;       
            this.baseMaxSpeed = 5.0;       
            this.baseDamage = 3.5;           
            this.baseKnockback = 24;       
            this.attackCooldown = 15;  
            this.iframeDuration = 10;
            this.dodgeCooldownBase = 40;
            this.baseBlockCooldown = 30;
        } else if (style === 'High Kicks') {
            this.baseMaxHealth = 45;
            this.baseMaxSpeed = 8.5;       
            this.baseDamage = 1.5;           
            this.baseKnockback = 30;       
            this.attackCooldown = 10;  
            this.iframeDuration = 8;
            this.dodgeCooldownBase = 25;
            this.baseBlockCooldown = 20;
        }

        this.equippedSkills =[];
        this.hasEnergyBeam = false;
        
        // Active Skills State
        this.hasFSSJ = false;
        this.hasKaioken = false;
        
        this.fssjTimer = 0;
        this.usedFSSJ = false;
        this.wantsToFSSJ = false;

        this.kaiokenTimer = 0;
        this.usedKaioken = false;
        this.wantsToKaioken = false;

        this.maxHealth = this.baseMaxHealth;
        this.health = this.maxHealth; 
        
        this.maxSpeed = this.baseMaxSpeed;
        this.damage = this.baseDamage;
        this.knockback = this.baseKnockback;

        this.maxForce = 0.4; 
        
        // KI SYSTEM
        this.maxKi = 100;
        this.ki = 100;
        this.isCharging = false;
        this.kiDashTimer = 0;
        this.wantsToShoot = false;
        this.wantsToRetreat = false;
        this.tpRequests =[]; 

        this.wantsToBeam = false;
        this.beamTimer = 0;

        // Defensive & Combat states
        this.invulnTimer = 0;
        this.attackLockout = 0;
        this.dodgeTimer = 0;
        this.isDodging = 0; 
        this.dodgeThreshold = 80 + Math.random() * 40; 
        this.currentDodgeDir = 1;

        // Block Mechanic
        this.isBlocking = 0;
        this.blockCooldown = 0;
        this.blockDuration = 15; 
        
        this.stunTimer = 0;
        this.tpCooldown = 0;
        this.comboCount = 0;
        this.comboTimer = 0;

        this.squishX = 1.0;
        this.squishY = 1.0;
        this.squishAngle = 0;

        this.lastHitByStyle = null;
        this.cruelDodgeTimer = 0;

        this.feintTimer = 0;
        this.isFeinting = false;
        this.circleDir = 1;

        this.leftHand = this.pos.copy();
        this.rightHand = this.pos.copy();
        this.walkCycle = 0;
        this.punchHand = 0; 
        this.punchTimer = 0;
        this.punchDuration = Math.max(4, this.attackCooldown - 2); 

        this.history =[];
        this.afterImages =[];
        
        // Calculate initial stats via logic pipeline
        this.updateStats([]);
        this.health = this.maxHealth; 
    }

    updateStats(skillsArray) {
        this.equippedSkills = skillsArray;

        // Record health percentage to prevent healing exploit on toggle
        let hpPercent = this.maxHealth > 0 ? (this.health / this.maxHealth) : 1.0;

        // Reset to bases
        let currMaxHealth = this.baseMaxHealth;
        let currMaxSpeed = this.baseMaxSpeed;
        let currDamage = this.baseDamage;
        let currKnockback = this.baseKnockback;

        // Apply Skill Tree Passives
        if (this.equippedSkills.includes('con_1')) currMaxHealth += 20;
        if (this.equippedSkills.includes('spd_1')) currMaxSpeed += 1.5;
        if (this.equippedSkills.includes('str_1')) currDamage += 2.0;
        
        this.hasEnergyBeam = this.equippedSkills.includes('ki_beam');
        this.hasFSSJ = this.equippedSkills.includes('race_2') && this.raceName === 'Saiyan';
        this.hasKaioken = this.equippedSkills.includes('con_2');

        // Apply Base Racial Multipliers
        let finalHpMult = this.raceData.hpMult;
        let finalSpdMult = this.raceData.spdMult;
        let finalDmgMult = this.raceData.dmgMult;
        let finalKbMult = this.raceData.kbMult;

        // Apply Racial Tree Skill (adds +0.20 to multipliers)
        if (this.equippedSkills.includes('race_1')) {
            finalHpMult += 0.20;
            finalSpdMult += 0.20;
            finalDmgMult += 0.20;
            finalKbMult += 0.20;
        }

        this.maxHealth = currMaxHealth * finalHpMult;
        this.maxSpeed = currMaxSpeed * finalSpdMult;
        this.damage = currDamage * finalDmgMult;
        this.knockback = currKnockback * finalKbMult;

        this.health = this.maxHealth * hpPercent; 
        this.baseBlockCooldown = Math.max(20, 100 - (this.maxSpeed * 10)); 
    }

    triggerPunch() {
        this.punchHand = Math.random() > 0.5 ? 1 : 2;
        this.punchTimer = this.punchDuration;
    }

    triggerDodge() {
        this.dodgeTimer = this.dodgeCooldownBase + Math.random() * 20; 
        this.isDodging = 15; 
        this.currentDodgeDir = Math.random() > 0.5 ? 1 : -1;
    }

    triggerBlock() {
        this.isBlocking = this.blockDuration;
        // Increased penalty so they don't block-spam repeatedly
        this.blockCooldown = this.baseBlockCooldown + 40; 
    }

    triggerTeleport(targetPos) {
        this.tpCooldown = 120 + Math.random() * 60; 
        this.tpRequests.push({ from: this.pos.copy(), to: targetPos.copy() });
        this.pos = targetPos.copy();
    }

    getEffectiveDamage() {
        let dmg = this.damage;
        // Standard Saiyan Zenkai (Overrides if FSSJ is active to prevent insane stacking)
        if (this.raceName === 'Saiyan' && this.fssjTimer <= 0) {
            let missingPercent = Math.max(0, 1 - (this.health / this.maxHealth));
            dmg *= (1 + 1.0 * missingPercent); 
        }
        
        if (this.fssjTimer > 0) dmg *= 1.5;
        if (this.kaiokenTimer > 0) dmg *= 2.5;

        return dmg;
    }

    getEffectiveSpeed() {
        let spd = this.maxSpeed;
        if (this.raceName === 'Android') {
            let missingPercent = Math.max(0, 1 - (this.health / this.maxHealth));
            spd *= (1 + 0.8 * missingPercent); 
        }
        
        if (this.fssjTimer > 0) spd *= 1.5;

        return spd;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    avoidBorders(canvasWidth, canvasHeight, currentSpeed) {
        let margin = 80; 
        let wallForce = new Vector(0, 0);
        let maxWallForce = currentSpeed * 3;

        if (this.pos.x < margin) wallForce.x = maxWallForce * (1 - this.pos.x / margin);
        else if (this.pos.x > canvasWidth - margin) wallForce.x = -maxWallForce * (1 - (canvasWidth - this.pos.x) / margin);

        if (this.pos.y < margin) wallForce.y = maxWallForce * (1 - this.pos.y / margin);
        else if (this.pos.y > canvasHeight - margin) wallForce.y = -maxWallForce * (1 - (canvasHeight - this.pos.y) / margin);

        return wallForce;
    }

    getSteering(opponent, canvasWidth, canvasHeight) {
        if (this.stunTimer > 0) return new Vector(0, 0);
        if (this.beamTimer > 0) return new Vector(0, 0); 

        // Active Buff Activation Logic (Once per match each)
        if (this.hasFSSJ && !this.usedFSSJ && this.health < this.maxHealth * 0.5) {
            this.wantsToFSSJ = true;
        }
        if (this.hasKaioken && !this.usedKaioken && this.health < this.maxHealth * 0.7) {
            this.wantsToKaioken = true;
        }

        let steer = new Vector(0, 0);
        let toOpp = Vector.sub(opponent.pos, this.pos);
        let dist = toOpp.mag();
        let currentSpeed = this.getEffectiveSpeed();

        this.lookTarget = opponent.pos.copy();

        let oppToMe = Vector.sub(this.pos, opponent.pos).normalize();
        let oppFacingMe = opponent.lookDir.dot(oppToMe) > 0.6; 
        let oppApproaching = opponent.vel.mag() > 1 && opponent.vel.copy().normalize().dot(oppToMe) > 0.6;
        let isThreat = dist < this.dodgeThreshold && oppFacingMe && oppApproaching && opponent.attackLockout <= 0;

        // Reduced random chance drastically so they don't retreat constantly
        if (!isThreat && this.ki < 40 && this.stunTimer <= 0 && this.attackLockout <= 0) {
            if (!this.wantsToRetreat && Math.random() < 0.005) { 
                this.wantsToRetreat = true;
            }
        }
        if (this.ki >= this.maxKi * 0.9 || isThreat) {
            this.wantsToRetreat = false; 
        }

        if (this.wantsToRetreat) {
            if (dist > 350) {
                this.isCharging = true; 
                return new Vector(0, 0); 
            } else {
                this.isCharging = false;
                let desired = toOpp.copy().mult(-1).normalize().mult(currentSpeed);
                steer.add(Vector.sub(desired, this.vel));
                steer.add(this.avoidBorders(canvasWidth, canvasHeight, currentSpeed));
                return steer.limit(this.maxForce);
            }
        }

        if (this.isCharging) {
            if (this.ki >= this.maxKi || isThreat) {
                this.isCharging = false;
            } else {
                return new Vector(0, 0); 
            }
        }

        steer.add(this.avoidBorders(canvasWidth, canvasHeight, currentSpeed));

        // --- INSTANT TRANSMISSION (TELEPORT) AI ---
        if (this.tpCooldown <= 0) {
            let shouldTP = false;
            if (dist > 350 && Math.random() < 0.05) shouldTP = true;
            if (isThreat && opponent.comboCount >= 2 && Math.random() < 0.4) shouldTP = true;
            
            if (shouldTP) {
                let tpTarget = opponent.pos.copy().add(opponent.lookDir.copy().mult(-80));
                tpTarget.x = Math.max(this.radius + 20, Math.min(canvasWidth - this.radius - 20, tpTarget.x));
                tpTarget.y = Math.max(this.radius + 20, Math.min(canvasHeight - this.radius - 20, tpTarget.y));
                
                this.triggerTeleport(tpTarget);
                this.lookTarget = opponent.pos.copy();
                return new Vector(0, 0);
            }
        }

        // --- THREAT DETECTION & DEFENSE LOGIC ---
        if (isThreat && this.isDodging <= 0 && this.isBlocking <= 0) {
            let canDodge = this.dodgeTimer <= 0;
            let canBlock = this.blockCooldown <= 0;

            // FSSJ Defensive Penalty (70% chance to drop guard completely due to rage)
            if (this.fssjTimer > 0 && Math.random() < 0.70) {
                canDodge = false;
                canBlock = false;
            }

            if (canBlock && canDodge) {
                if (Math.random() < 0.5) this.triggerBlock();
                else this.triggerDodge();
            } else if (canBlock) {
                this.triggerBlock();
            } else if (canDodge) {
                this.triggerDodge();
            }
        }

        // --- KI OFFENSE AI ---
        if (!isThreat && this.stunTimer <= 0 && this.isDodging <= 0) {
            
            if (this.hasEnergyBeam && this.ki >= 50 && this.attackLockout <= 0 && dist < 600) {
                let beamChance = dist > 250 ? 0.015 : 0.005; 
                if (Math.random() < beamChance) {
                    this.wantsToBeam = true;
                    return new Vector(0, 0); 
                }
            }

            if (this.ki < 40 && dist > 300 && Math.random() < 0.05) {
                this.isCharging = true;
                return new Vector(0, 0);
            } 
            else if (this.ki >= 15 && dist > 180 && Math.random() < 0.03 && this.attackLockout <= 0) {
                this.wantsToShoot = true;
                this.attackLockout = 15;
            }
            else if (this.ki >= 30 && dist > 150 && dist < 400 && Math.random() < 0.02 && this.kiDashTimer <= 0) {
                this.kiDashTimer = 25;
                this.ki -= 30;
            }
        }

        // --- MOVEMENT EXECUTION ---
        if (this.isBlocking > 0) { 
            currentSpeed *= 0.1; // Reduced from 0.2 to lower backward drifting
            let holdDir = Vector.sub(this.pos, opponent.pos).normalize();
            steer.add(holdDir.mult(currentSpeed * 0.5)); // Slower backward force
        } else if (this.isDodging > 0) { 
            let dodgeVector = new Vector(-opponent.vel.y * this.currentDodgeDir, opponent.vel.x * this.currentDodgeDir).normalize();
            steer.add(dodgeVector.mult(currentSpeed * 2.5));
        } else {
            if (this.attackLockout > 0 && dist < 120) {
                let toOppNorm = toOpp.copy().normalize();
                let tangent = new Vector(-toOppNorm.y, toOppNorm.x).mult(this.circleDir);
                let distanceControl = dist < 70 ? -0.2 : 0.4; 
                let desired = Vector.add(toOppNorm.mult(distanceControl), tangent.mult(0.8)).normalize().mult(currentSpeed);
                steer.add(Vector.sub(desired, this.vel));
            } else if (opponent.attackLockout > 0) {
                let desired = toOpp.copy().normalize().mult(currentSpeed);
                steer.add(Vector.sub(desired, this.vel));
            } else {
                this.feintTimer--;
                if (this.feintTimer <= 0) {
                    this.feintTimer = 20 + Math.random() * 20;
                    this.circleDir = Math.random() > 0.5 ? 1 : -1;
                    this.isFeinting = Math.random() > 0.8; 
                }

                if (this.isFeinting && dist > this.radius * 3) {
                    let toOppNorm = toOpp.copy().normalize();
                    let tangent = new Vector(-toOppNorm.y, toOppNorm.x).mult(this.circleDir);
                    let desired = Vector.add(toOppNorm.mult(0.6), tangent.mult(0.8)).normalize().mult(currentSpeed);
                    steer.add(Vector.sub(desired, this.vel));
                } else {
                    let desired = toOpp.copy().normalize().mult(currentSpeed * 1.2); 
                    steer.add(Vector.sub(desired, this.vel));
                }
            }
        }

        return steer.limit(this.maxForce);
    }

    update(canvasWidth, canvasHeight) {
        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.attackLockout > 0) this.attackLockout--;
        if (this.dodgeTimer > 0) this.dodgeTimer--;
        if (this.isDodging > 0) this.isDodging--;
        if (this.isBlocking > 0) this.isBlocking--;
        if (this.blockCooldown > 0) this.blockCooldown--;
        if (this.cruelDodgeTimer > 0) this.cruelDodgeTimer--;
        if (this.stunTimer > 0) this.stunTimer--;
        if (this.tpCooldown > 0) this.tpCooldown--;
        
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.comboCount = 0; 
        }

        if (this.beamTimer > 0) {
            this.beamTimer--;
            this.acc.mult(0); 
            this.vel.mult(0.8); 
        }

        // Active Buffs Countdown
        if (this.fssjTimer > 0) this.fssjTimer--;
        
        if (this.kaiokenTimer > 0) {
            this.kaiokenTimer--;
            // Drain 1 HP per 60 frames (1 sec)
            if (this.kaiokenTimer % 60 === 0) {
                this.health -= 1;
            }
        }

        if (this.isCharging) {
            this.ki = Math.min(this.maxKi, this.ki + 1.2);
        } else {
            this.ki = Math.min(this.maxKi, this.ki + 0.05); 
        }

        if (this.kiDashTimer > 0) {
            this.kiDashTimer--;
            this.vel = this.lookDir.copy().mult(this.maxSpeed * 3.5);
            this.acc.mult(0); 
        }

        if ((this.isDodging > 0 || this.kiDashTimer > 0 || this.vel.mag() > this.maxSpeed * 1.5) && this.history.length % 2 === 0) {
            let isFlashing = this.invulnTimer > 0 && Math.floor(this.invulnTimer / 4) % 2 === 0;
            this.afterImages.push(new AfterImage(this.pos.x, this.pos.y, this.radius, this.color, isFlashing));
        }

        for (let i = this.afterImages.length - 1; i >= 0; i--) {
            this.afterImages[i].update();
            if (this.afterImages[i].life <= 0) this.afterImages.splice(i, 1);
        }

        this.squishX += (1.0 - this.squishX) * 0.15;
        this.squishY += (1.0 - this.squishY) * 0.15;

        if (this.vel.mag() > 1.0) {
            this.history.push(this.pos.copy());
            if (this.history.length > 15) this.history.shift();
        } else if (this.history.length > 0) {
            this.history.shift(); 
        }

        this.vel.add(this.acc);
        this.vel.mult(0.96); 
        this.pos.add(this.vel);
        this.acc.mult(0); 

        if (this.lookTarget && this.stunTimer <= 0 && this.beamTimer <= 0) {
            let desiredLook = Vector.sub(this.lookTarget, this.pos);
            if (desiredLook.mag() > 0.1) {
                desiredLook.normalize();
                this.lookDir.x += (desiredLook.x - this.lookDir.x) * 0.25; 
                this.lookDir.y += (desiredLook.y - this.lookDir.y) * 0.25;
                this.lookDir.normalize();
            }
        }

        // --- IK HANDS CALCULATION ---
        if (this.beamTimer <= 0) {
            this.walkCycle += this.vel.mag() * 0.15;
        }

        if (this.punchTimer > 0) {
            this.punchTimer--;
        } else {
            this.punchHand = 0;
        }

        let forward = this.lookDir.copy();
        let right = new Vector(-forward.y, forward.x);
        
        let leftTarget, rightTarget;

        if (this.beamTimer > 0) {
            leftTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 1.5))
                               .add(right.copy().mult(-6));
            rightTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 1.5))
                                .add(right.copy().mult(6));
        } else if (this.isBlocking > 0) {
            leftTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 0.9))
                               .add(right.copy().mult(this.radius * 0.4));
            rightTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 0.9))
                                .add(right.copy().mult(-this.radius * 0.4)); 
        } else {
            let bobLeft = Math.sin(this.walkCycle) * 4;
            let bobRight = Math.sin(this.walkCycle + Math.PI) * 4;

            leftTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 0.4))
                                   .add(right.copy().mult(-this.radius * 0.9))
                                   .add(forward.copy().mult(bobLeft));
                                   
            rightTarget = Vector.add(this.pos, forward.copy().mult(this.radius * 0.4))
                                    .add(right.copy().mult(this.radius * 0.9))
                                    .add(forward.copy().mult(bobRight));

            if (this.punchTimer > 0) {
                let t = 1 - (this.punchTimer / this.punchDuration); 
                let extension = 0;
                
                if (t < 0.3) {
                    extension = (t / 0.3) * 35; 
                } else {
                    extension = (1 - ((t - 0.3) / 0.7)) * 35; 
                }

                if (this.punchHand === 1) {
                    leftTarget = Vector.add(this.pos, forward.copy().mult(this.radius + extension))
                                       .add(right.copy().mult(-this.radius * 0.2));
                } else if (this.punchHand === 2) {
                    rightTarget = Vector.add(this.pos, forward.copy().mult(this.radius + extension))
                                        .add(right.copy().mult(this.radius * 0.2));
                }
            }
        }

        if (this.stunTimer > 0) {
            leftTarget = Vector.add(this.pos, right.copy().mult(-this.radius * 1.2));
            rightTarget = Vector.add(this.pos, right.copy().mult(this.radius * 1.2));
        }

        let lerpSpeed = 0.55; 
        this.leftHand.x += (leftTarget.x - this.leftHand.x) * lerpSpeed;
        this.leftHand.y += (leftTarget.y - this.leftHand.y) * lerpSpeed;
        this.rightHand.x += (rightTarget.x - this.rightHand.x) * lerpSpeed;
        this.rightHand.y += (rightTarget.y - this.rightHand.y) * lerpSpeed;

        if (this.pos.x < this.radius) { this.pos.x = this.radius; this.vel.x *= -0.8; }
        if (this.pos.x > canvasWidth - this.radius) { this.pos.x = canvasWidth - this.radius; this.vel.x *= -0.8; }
        if (this.pos.y < this.radius) { this.pos.y = this.radius; this.vel.y *= -0.8; }
        if (this.pos.y > canvasHeight - this.radius) { this.pos.y = canvasHeight - this.radius; this.vel.y *= -0.8; }
    }

    draw(ctx) {
        this.afterImages.forEach(ai => ai.draw(ctx));

        // Specialized Aura System
        let hasAura = this.isCharging || this.kiDashTimer > 0 || this.beamTimer > 0 || this.fssjTimer > 0 || this.kaiokenTimer > 0;
        
        if (hasAura) {
            ctx.save();
            let pulse = Math.sin(Date.now() / 50) * 5;
            let auraSize = this.radius + 15 + pulse;
            
            let aColor = this.color;
            let aWidth = 3;
            
            if (this.fssjTimer > 0) {
                aColor = '#FF8C00'; // Dark Orange
                aWidth = 5;
            } else if (this.kaiokenTimer > 0) {
                aColor = 'rgba(255, 50, 50, 0.8)'; // Faint red
                aWidth = 4;
            } else if (this.kiDashTimer > 0) {
                aWidth = 5;
            }

            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, auraSize, 0, Math.PI * 2);
            ctx.strokeStyle = aColor;
            ctx.lineWidth = aWidth;
            ctx.shadowBlur = 20;
            ctx.shadowColor = aColor;
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        if (this.history.length > 1) {
            for (let i = 0; i < this.history.length - 1; i++) {
                ctx.beginPath();
                ctx.moveTo(this.history[i].x, this.history[i].y);
                ctx.lineTo(this.history[i+1].x, this.history[i+1].y);
                let alpha = (i / this.history.length) * 0.4;
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = alpha;
                ctx.lineWidth = (i / this.history.length) * this.radius * 1.5;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.closePath();
            }
            ctx.globalAlpha = 1.0;
        }

        let isFlashing = this.invulnTimer > 0 && Math.floor(this.invulnTimer / 4) % 2 === 0;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.squishAngle);
        ctx.scale(this.squishX, this.squishY);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = isFlashing ? '#FFFFFF' : this.color;
        
        if (this.stunTimer > 0 && !isFlashing) {
            ctx.fillStyle = '#666666'; 
        }

        ctx.fill();
        ctx.strokeStyle = this.isPlayer ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 3 / Math.max(this.squishX, this.squishY); 
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        
        const drawHand = (pos) => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = isFlashing ? '#FFFFFF' : this.color;
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        };
        drawHand(this.leftHand);
        drawHand(this.rightHand);

        if (this.isBlocking > 0) {
            ctx.beginPath();
            let angleOffset = Math.PI * 0.6;
            let centerAngle = Math.atan2(this.lookDir.y, this.lookDir.x);
            ctx.arc(this.pos.x, this.pos.y, this.radius + 12, centerAngle - angleOffset, centerAngle + angleOffset);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();
        }

        if (this.cruelDodgeTimer > 0) {
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }

        if (this.stunTimer > 0) {
            let offset = (Date.now() / 100) % (Math.PI * 2);
            ctx.fillStyle = '#FFFF00';
            for (let i = 0; i < 3; i++) {
                let starAngle = offset + (i * Math.PI * 2 / 3);
                let sx = this.pos.x + Math.cos(starAngle) * (this.radius + 10);
                let sy = this.pos.y + Math.sin(starAngle) * (this.radius + 10);
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        let dir = this.lookDir.copy().mult(this.radius);
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x + dir.x, this.pos.y + dir.y);
        ctx.strokeStyle = isFlashing ? '#FF0000' : '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();

        let healthPercentage = Math.max(0, this.health / this.maxHealth);
        let barWidth = 40;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.pos.x - barWidth / 2, this.pos.y - this.radius - 20, barWidth, 6);
        ctx.fillStyle = this.isPlayer ? '#00FF00' : '#FF0000';
        ctx.fillRect(this.pos.x - barWidth / 2, this.pos.y - this.radius - 20, barWidth * healthPercentage, 6);

        ctx.fillStyle = this.isPlayer ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        let labelText = this.isPlayer ? `P1: ${this.raceName} ${this.style}` : `${this.raceName} ${this.style}`;
        ctx.fillText(labelText, this.pos.x, this.pos.y - this.radius - 28);
    }
}

import { state } from './state.js';
import { Vector } from './vector.js';
import { logCombat } from './ui.js';
import { spawnExplosion } from './vfx.js';
import { KiBlast, HomingKiBlast, KiBall, KiGrenade } from './particle.js';

export function calculateHitEffects(attacker, defender, pushDir, hitQuality) {
    let finalDmg = attacker.getEffectiveDamage();
    let ignoreKB = false;
    let dodged = false;
    let blocked = false;
    let stunFrames = 0;

    let isFinisher = (attacker.comboCount % 4 === 0 && attacker.comboCount > 0);
    let kbMult = isFinisher ? 1.5 : 0.02;
    
    if (attacker.kiDashTimer > 0) {
        isFinisher = false;
        kbMult = 0.5;
        logCombat(`${attacker.isPlayer ? 'Player' : 'Enemy'} KI DASH IMPACT!`);
    }

    if (defender.fssjTimer > 0) finalDmg *= 1.3; 

    let kbVec = pushDir.copy().mult(attacker.knockback * kbMult);

    if (defender.isBlocking > 0) {
        blocked = true;
        finalDmg *= 0.1; 
        if (Math.random() < 0.3 && defender.speechTimer <= 0) {
            defender.say(["Tsk!", "Weak.", "Nice try!"][Math.floor(Math.random() * 3)], 40);
        }
        logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} BLOCKED!`);
    } else {
        if (defender.raceName === 'Froster') {
            if (defender.cruelDodgeTimer > 0) {
                dodged = true;
                defender.cruelDodgeTimer = 0;
                if (defender.speechTimer <= 0) {
                    defender.say(["Missed me!", "Too slow!"][Math.floor(Math.random() * 2)], 40);
                }
                logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} Froster DODGED!`);
            } else if (Math.random() < 0.10) {
                ignoreKB = true;
                defender.cruelDodgeTimer = 60; 
                if (defender.speechTimer <= 0) defender.say("Fools play.", 40);
                logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} Froster CRUEL!`);
            }
        }

        if (dodged) {
            finalDmg = 0;
            kbVec = new Vector(0, 0);
        } else {
            if (attacker.kiDashTimer > 0) {
                stunFrames = 35;
                attacker.kiDashTimer = 0; 
            } else if (hitQuality > 0.8 && Math.random() < 0.2 + (attacker.comboCount % 4) * 0.1) {
                stunFrames = 25 + Math.floor(Math.random() * 15); 
            }

            if (defender.fssjTimer > 0) stunFrames += 5;

            if ((defender.raceName === 'Human' || defender.raceName === 'Half-Saiyan') && defender.lastHitByStyle === attacker.style) {
                finalDmg *= 0.5;
                logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} ${defender.raceName} ADAPTED!`);
            }
            if (defender.raceName === 'Namekian') {
                let missingPercent = Math.max(0, 1 - (defender.health / defender.maxHealth));
                finalDmg *= (1 - 0.5 * missingPercent); 
            }
            
            defender.lastHitByStyle = attacker.style;
            if (ignoreKB) kbVec = new Vector(0, 0);

            if (stunFrames > 15 && defender.speechTimer <= 0) {
                defender.say(["Ugh!", "Gah!", "Guh..."][Math.floor(Math.random() * 3)], 30);
            }
            if (isFinisher && attacker.speechTimer <= 0) {
                attacker.say(["Take this!", "Haaa!", "Down you go!"][Math.floor(Math.random() * 3)], 50);
            }
        }
    }

    return { damage: finalDmg, kb: kbVec, dodged: dodged, blocked: blocked, stunFrames: stunFrames, isComboFinisher: isFinisher };
}

export function tryTeleportCounter(defender, attacker, canvasWidth, canvasHeight) {
    let tpChance = defender.fssjTimer > 0 ? 0.05 : 0.20; 
    if (defender.tpCooldown <= 0 && Math.random() < tpChance) {
        let tpTarget = attacker.pos.copy().add(attacker.lookDir.copy().mult(-70));
        tpTarget.x = Math.max(defender.radius + 20, Math.min(canvasWidth - defender.radius - 20, tpTarget.x));
        tpTarget.y = Math.max(defender.radius + 20, Math.min(canvasHeight - defender.radius - 20, tpTarget.y));
        
        defender.triggerTeleport(tpTarget);
        defender.lookTarget = attacker.pos.copy();
        defender.attackLockout = 0; 
        
        if (defender.speechTimer <= 0) {
            defender.say(["Right here!", "Behind you!", "Too slow!"][Math.floor(Math.random() * 3)], 40);
        }
        
        logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} TELEPORT COUNTER!`);
    }
}

export function handleCombat(width, height) {
    let dist = Vector.dist(state.blueBrawler.pos, state.enemyBrawler.pos);
    let minDist = state.blueBrawler.radius + state.enemyBrawler.radius;

    if (state.blueBrawler.barrageTimer > 0 && state.enemyBrawler.barrageTimer > 0 && dist < 100) {
        let clashMid = Vector.add(state.blueBrawler.pos, state.enemyBrawler.pos).mult(0.5);
        spawnExplosion(clashMid.x, clashMid.y, '#FFFFFF', 4, 2);
        state.blueBrawler.vel.sub(state.blueBrawler.lookDir.copy().mult(1));
        state.enemyBrawler.vel.sub(state.enemyBrawler.lookDir.copy().mult(1));
        state.screenShake = Math.max(state.screenShake, 3);
        
        if (Math.random() < 0.1) {
            if (state.blueBrawler.speechTimer <= 0) state.blueBrawler.say("Don't hold back!", 40);
            if (state.enemyBrawler.speechTimer <= 0) state.enemyBrawler.say("Uaaaaah!", 40);
        }
        return; 
    }

    const processBarrageHit = (attacker, defender) => {
        if (attacker.barrageTimer > 0 && Vector.dist(attacker.pos, defender.pos) < 100) {
            let toDef = Vector.sub(defender.pos, attacker.pos).normalize();
            if (attacker.lookDir.dot(toDef) > 0.4) {
                defender.health -= (attacker.getEffectiveDamage() * 0.08); 
                defender.stunTimer = Math.max(defender.stunTimer, 10); 
                spawnExplosion(defender.pos.x, defender.pos.y, attacker.color, 1, 1);
            }
        }
    };
    processBarrageHit(state.blueBrawler, state.enemyBrawler);
    processBarrageHit(state.enemyBrawler, state.blueBrawler);

    // Hard Locks
    let locksA = state.blueBrawler.chokeTimer > 0 || state.blueBrawler.isTransformingSSJ > 0 || state.blueBrawler.barrageTimer > 0 || state.blueBrawler.absorbTimer > 0 || state.blueBrawler.dragonThrowTimer > 0 || state.blueBrawler.wolfRushTimer > 0;
    let locksB = state.enemyBrawler.chokeTimer > 0 || state.enemyBrawler.isTransformingSSJ > 0 || state.enemyBrawler.barrageTimer > 0 || state.enemyBrawler.absorbTimer > 0 || state.enemyBrawler.dragonThrowTimer > 0 || state.enemyBrawler.wolfRushTimer > 0;
    
    if (locksA || locksB) {
        return;
    }

    if (dist < minDist) {
        let overlap = minDist - dist;
        if (dist === 0) { dist = 1; state.blueBrawler.pos.x += 1; }
        let pushDir = Vector.sub(state.enemyBrawler.pos, state.blueBrawler.pos).normalize();
        
        state.blueBrawler.pos.sub(pushDir.copy().mult(overlap * 0.05));
        state.enemyBrawler.pos.add(pushDir.copy().mult(overlap * 0.05));

        let blueToEnemy = pushDir; 
        let enemyToBlue = pushDir.copy().mult(-1);
        
        let blueFacingEnemy = state.blueBrawler.lookDir.dot(blueToEnemy) > 0.3;
        let enemyFacingBlue = state.enemyBrawler.lookDir.dot(enemyToBlue) > 0.3;

        let blueCanAttack = state.blueBrawler.invulnTimer === 0 && state.blueBrawler.attackLockout === 0 && state.blueBrawler.stunTimer === 0 && state.blueBrawler.beamTimer <= 0;
        let enemyCanAttack = state.enemyBrawler.invulnTimer === 0 && state.enemyBrawler.attackLockout === 0 && state.enemyBrawler.stunTimer === 0 && state.enemyBrawler.beamTimer <= 0;

        let hit1 = null; 
        let hit2 = null; 
        let hitOccurred = false;
        let clashPoint = Vector.add(state.blueBrawler.pos, pushDir.copy().mult(state.blueBrawler.radius));

        if (blueFacingEnemy && blueCanAttack && state.enemyBrawler.invulnTimer === 0) {
            let hitQuality = blueToEnemy.dot(state.blueBrawler.lookDir);
            state.blueBrawler.comboCount++;
            
            hit1 = calculateHitEffects(state.blueBrawler, state.enemyBrawler, blueToEnemy, hitQuality);
            state.blueBrawler.attackLockout = state.blueBrawler.attackCooldown;
            state.enemyBrawler.invulnTimer = state.enemyBrawler.iframeDuration;
            hitOccurred = true;
            state.blueBrawler.triggerPunch();

            if (!hit1.dodged) {
                if (hit1.blocked) {
                    state.blueBrawler.comboCount = 0; 
                    spawnExplosion(clashPoint.x, clashPoint.y, '#AAAAAA', 8, 0.5);
                    state.hitStopFrames = Math.max(state.hitStopFrames, 2); 
                    
                    state.blueBrawler.vel.add(enemyToBlue.copy().mult(3));
                    state.enemyBrawler.vel.add(blueToEnemy.copy().mult(1));

                    tryTeleportCounter(state.enemyBrawler, state.blueBrawler, width, height);
                } else {
                    state.blueBrawler.comboTimer = 90; 
                    if (hit1.isComboFinisher) logCombat('P1: 4-HIT FINISHER!');
                    
                    state.enemyBrawler.squishX = 0.6;
                    state.enemyBrawler.squishY = 1.4;
                    state.enemyBrawler.squishAngle = Math.atan2(blueToEnemy.y, blueToEnemy.x);
                    state.enemyBrawler.stunTimer = Math.max(state.enemyBrawler.stunTimer, hit1.stunFrames);

                    spawnExplosion(clashPoint.x, clashPoint.y, state.enemyBrawler.color, hit1.isComboFinisher ? 30 : 6, hit1.isComboFinisher ? 3 : 1);
                    state.screenShake = Math.max(state.screenShake, hit1.isComboFinisher ? 15 : 2);
                    state.hitStopFrames = Math.max(state.hitStopFrames, hit1.isComboFinisher ? 10 : 2);
                }
            } else {
                state.blueBrawler.comboCount = 0;
                let dodgeZip = new Vector(-blueToEnemy.y, blueToEnemy.x).mult(Math.random() > 0.5 ? 1 : -1);
                state.enemyBrawler.pos.add(dodgeZip.copy().mult(12)); 
                state.enemyBrawler.vel = dodgeZip.copy().mult(6); 
                
                tryTeleportCounter(state.enemyBrawler, state.blueBrawler, width, height);
            }
        }

        if (enemyFacingBlue && enemyCanAttack && state.blueBrawler.invulnTimer === 0) {
            let hitQuality = enemyToBlue.dot(state.enemyBrawler.lookDir);
            state.enemyBrawler.comboCount++;

            hit2 = calculateHitEffects(state.enemyBrawler, state.blueBrawler, enemyToBlue, hitQuality);
            state.enemyBrawler.attackLockout = state.enemyBrawler.attackCooldown;
            state.blueBrawler.invulnTimer = state.blueBrawler.iframeDuration;
            hitOccurred = true;
            state.enemyBrawler.triggerPunch();

            if (!hit2.dodged) {
                if (hit2.blocked) {
                    state.enemyBrawler.comboCount = 0;
                    spawnExplosion(clashPoint.x, clashPoint.y, '#AAAAAA', 8, 0.5);
                    state.hitStopFrames = Math.max(state.hitStopFrames, 2);

                    state.enemyBrawler.vel.add(blueToEnemy.copy().mult(3));
                    state.blueBrawler.vel.add(enemyToBlue.copy().mult(1));

                    tryTeleportCounter(state.blueBrawler, state.enemyBrawler, width, height);
                } else {
                    state.enemyBrawler.comboTimer = 90;
                    if (hit2.isComboFinisher) logCombat('Enemy: 4-HIT FINISHER!');

                    state.blueBrawler.squishX = 0.6;
                    state.blueBrawler.squishY = 1.4;
                    state.blueBrawler.squishAngle = Math.atan2(enemyToBlue.y, enemyToBlue.x);
                    state.blueBrawler.stunTimer = Math.max(state.blueBrawler.stunTimer, hit2.stunFrames);

                    spawnExplosion(clashPoint.x, clashPoint.y, state.blueBrawler.color, hit2.isComboFinisher ? 30 : 6, hit2.isComboFinisher ? 3 : 1);
                    state.screenShake = Math.max(state.screenShake, hit2.isComboFinisher ? 15 : 2);
                    state.hitStopFrames = Math.max(state.hitStopFrames, hit2.isComboFinisher ? 10 : 2);
                }
            } else {
                state.enemyBrawler.comboCount = 0;
                let dodgeZip = new Vector(-enemyToBlue.y, enemyToBlue.x).mult(Math.random() > 0.5 ? 1 : -1);
                state.blueBrawler.pos.add(dodgeZip.copy().mult(12)); 
                state.blueBrawler.vel = dodgeZip.copy().mult(6); 

                tryTeleportCounter(state.blueBrawler, state.enemyBrawler, width, height);
            }
        }

        // Apply Results
        if (hit1) {
            state.enemyBrawler.health -= hit1.damage;
            if (!hit1.dodged && !hit1.blocked) state.enemyBrawler.vel.add(hit1.kb);
        }
        
        if (hit2) {
            state.blueBrawler.health -= hit2.damage;
            if (!hit2.dodged && !hit2.blocked) state.blueBrawler.vel.add(hit2.kb);
        }

        if (!hitOccurred) {
            state.blueBrawler.vel.sub(pushDir.copy().mult(0.2));
            state.enemyBrawler.vel.add(pushDir.copy().mult(0.2));
        }
    }
}

export function checkObstacleCollisions() {
    let activeBrawlers =[state.blueBrawler, state.enemyBrawler].filter(b => b && !b.isDead);
    
    // Brawler against Obstacles
    activeBrawlers.forEach(b => {
        state.currentArena.obstacles.forEach(obs => {
            if (obs.isDead || obs.falling) return;
            
            let dist = Vector.dist(b.pos, obs.pos);
            let minDist = b.radius + obs.radius;
            
            if (dist < minDist) {
                let overlap = minDist - dist;
                let pushDir = Vector.sub(b.pos, obs.pos).normalize();

                // If Brawler hits it hard (knockback state)
                if (b.vel.mag() > 8) {
                    obs.takeDamage(b.vel.mag() * 1.5, b.vel);
                    
                    if (b.stunTimer > 0) {
                        let envDamage = b.vel.mag() * 0.2;
                        b.health = Math.max(1, b.health - envDamage);
                        logCombat(`${b.isPlayer ? 'Player' : 'Enemy'} crashed into a ${obs.type}!`);
                    }

                    spawnExplosion(b.pos.x, b.pos.y, '#AAAAAA', 5, 1);
                    state.screenShake = Math.max(state.screenShake, 5);
                    
                    b.vel.mult(-0.3); // Bounce off the obstacle
                } else {
                    // Normal physical push
                    if (obs.isStatic) {
                        b.pos.add(pushDir.copy().mult(overlap));
                    } else {
                        b.pos.add(pushDir.copy().mult(overlap * 0.5));
                        obs.pos.sub(pushDir.copy().mult(overlap * 0.5));
                        obs.vel.sub(pushDir.copy().mult(0.5));
                    }
                }
            }
        });
    });

    // Projectiles against Obstacles
    let allProjectiles =[...state.kiBlasts, ...state.homingBlasts, ...state.kiBalls, ...state.kiGrenades];
    
    allProjectiles.forEach(p => {
        if (!p.active && !(p instanceof KiGrenade && !p.detonating)) return;

        state.currentArena.obstacles.forEach(obs => {
            if (obs.isDead || obs.falling) return;
            let dist = Vector.dist(p.pos, obs.pos);
            
            if (dist < obs.radius + p.radius) {
                if (p instanceof KiBlast || p instanceof HomingKiBlast) {
                    p.life = 0; // Destroy projectile
                    obs.takeDamage(10, p.vel);
                    spawnExplosion(p.pos.x, p.pos.y, p.color, 4, 0.5);
                } else if (p instanceof KiBall) {
                    p.life = 0;
                    obs.takeDamage(50, p.vel);
                    spawnExplosion(p.pos.x, p.pos.y, p.color, 20, 2);
                    state.screenShake = Math.max(state.screenShake, 10);
                } else if (p instanceof KiGrenade) {
                    p.detonating = true;
                    p.vel.mult(0);
                }
            }
        });
    });

    // Beams against obstacles
    state.beams.forEach(beam => {
        if (!beam.active) return;
        state.currentArena.obstacles.forEach(obs => {
            if (obs.isDead || obs.falling) return;
            let dummyTarget = { pos: obs.pos, radius: obs.radius };
            if (beam.checkCollision(dummyTarget)) {
                obs.takeDamage(2, beam.brawler.lookDir.copy().mult(5)); // Sustained damage
                spawnExplosion(obs.pos.x, obs.pos.y, beam.color, 1, 0.5);
            }
        });
    });
}

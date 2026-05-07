

import { state } from './state.js';
import { ENEMY_COLORS, STYLES } from './config.js';
import { Vector } from './vector.js';
import { Brawler } from './brawler.js';
import { RACES } from './races.js';
import { KiBlast, HomingKiBlast, KiBall, KiGrenade, EnergyBeam } from './particle.js';
import { Arena } from './arena.js';

import { spawnExplosion, spawnTeleportLines } from './vfx.js';
import { getSegmentIntersection } from './utils.js';
import { getEquippedSkillIDs, renderSkillTree, resetSkillTree, initSkillTreeEvents } from './skills.js';
import { handleCombat, checkObstacleCollisions } from './combat.js';
import { updateProfileUI, showRaceSelect, showFateSelection, showUpgradeSelect, showAbsorbSelect, initUIEvents, logCombat } from './ui.js';
import { UPGRADES } from './upgrades.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
export const width = canvas.width;
export const height = canvas.height;

// ========================
// EXPORTED CORE FLOW FUNCTIONS
// ========================

export function enterHub() {
    state.currentMode = 'HUB';
    document.getElementById('hub-ui').classList.remove('hidden');
    
    if (state.pendingChats.length > 0) {
        document.getElementById('phone-notif').classList.remove('hidden');
        document.getElementById('contact-module').classList.add('has-notification');
    }
    
    state.currentArena = new Arena('Space', width, height);
    
    state.particles = [];
    state.kiBlasts =[];
    state.homingBlasts = [];
    state.kiBalls = [];
    state.kiGrenades =[];
    state.beams = [];

    if (!state.blueBrawler) {
        let style = STYLES[Math.floor(Math.random() * STYLES.length)];
        state.blueBrawler = new Brawler(width / 2, height / 2, '#0074D9', true, style, state.playerSelectedRace);
        state.blueBrawler.updateStats(getEquippedSkillIDs());
    } else {
        state.blueBrawler.fullRestore();
        state.blueBrawler.pos = new Vector(width / 2, height / 2);
        state.blueBrawler.vel.mult(0);
        state.blueBrawler.updateStats(getEquippedSkillIDs());
    }
    
    state.enemyBrawler = null; 
    
    updateProfileUI();
    state.isPlaying = true;
    logCombat('Idling in the void. Manage skills or seek a battle.');
}

export function spawnEnemy() {
    let spawnX = state.blueBrawler.pos.x > width / 2 ? width / 4 : (width / 4) * 3;
    let spawnY = height / 4 + Math.random() * (height / 2);

    // Check Revenge Queue
    if (state.revengeQueue.length > 0 && Math.random() < 0.3) {
        let revenger = state.revengeQueue.shift();
        state.enemyBrawler = new Brawler(spawnX, spawnY, revenger.color, false, revenger.style, revenger.race);
        state.enemyBrawler.moralAlignment = revenger.alignment;
        state.enemyBrawler.isRevenge = true;
        
        let scaleFactor = Math.min(1.0, 0.5 + (state.score * 0.15));
        
        state.enemyBrawler.maxHealth = state.enemyBrawler.baseMaxHealth * scaleFactor * 1.5; 
        state.enemyBrawler.health = state.enemyBrawler.maxHealth;
        state.enemyBrawler.damage = state.enemyBrawler.baseDamage * scaleFactor * 1.3;
        state.enemyBrawler.maxSpeed = state.enemyBrawler.baseMaxSpeed * (0.8 + (scaleFactor * 0.2)) * 1.1; 
        
        let revengeSkills =['race_all_1', 'ki_beam', 'spd_3', 'str_3']; 
        if (revenger.race === 'Saiyan' || revenger.race === 'Half-Saiyan') revengeSkills.push('race_3');
        state.enemyBrawler.updateStats(revengeSkills);
        return;
    }

    // Standard Generation
    let color = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
    let style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let allRaces = Object.keys(RACES);
    let randomRace = allRaces[Math.floor(Math.random() * allRaces.length)];
    
    state.enemyBrawler = new Brawler(spawnX, spawnY, color, false, style, randomRace);
    state.enemyBrawler.moralAlignment = Math.random() > 0.5 ? 'Hero' : 'Villain';
    state.enemyBrawler.isRevenge = false;
    
    let enemySkills =[];
    if (state.score >= 1 && Math.random() < 0.3) enemySkills.push('race_all_1'); 
    if (state.score >= 2 && Math.random() < 0.3) enemySkills.push('ki_beam');
    if (state.score >= 2 && Math.random() < 0.3) enemySkills.push('ki_4'); 
    if (state.score >= 3 && Math.random() < 0.3) enemySkills.push('str_3'); 
    if (state.score >= 3 && Math.random() < 0.3) enemySkills.push('con_2'); 
    if (state.score >= 4 && Math.random() < 0.3) enemySkills.push('spd_3'); 
    if (state.score >= 4 && Math.random() < 0.3) enemySkills.push('ki_3'); 
    if (state.score >= 5 && (randomRace === 'Saiyan' || randomRace === 'Half-Saiyan') && Math.random() < 0.5) enemySkills.push('race_3'); 
    
    state.enemyBrawler.updateStats(enemySkills);

    if (randomRace === 'Bio-Android') {
        for(let i=0; i<3; i++) {
            let randomUpgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
            randomUpgrade.apply(state.enemyBrawler);
        }
    }

    let scaleFactor = Math.min(1.0, 0.5 + (state.score * 0.15));
    state.enemyBrawler.maxHealth *= scaleFactor;
    state.enemyBrawler.health = state.enemyBrawler.maxHealth;
    state.enemyBrawler.damage *= scaleFactor;
    state.enemyBrawler.knockback *= scaleFactor;
    state.enemyBrawler.maxSpeed *= (0.8 + (scaleFactor * 0.2)); 
}

export function startZenkaiBattle() {
    document.getElementById('ui-layer').classList.add('hidden');
    document.getElementById('zenkai-prompt').classList.add('hidden');

    state.currentMode = 'ZENKAI';
    
    let selectedTheme = Math.random() > 0.5 ? 'Desert' : 'Space';
    state.currentArena = new Arena(selectedTheme, width, height);
    
    state.particles = [];
    state.kiBlasts =[];
    state.homingBlasts = [];
    state.kiBalls =[];
    state.kiGrenades = [];
    state.beams =[];

    state.blueBrawler.pos = new Vector(width / 4, height / 2);
    state.blueBrawler.vel.mult(0);
    state.blueBrawler.fullRestore();

    let spawnX = (width / 4) * 3;
    let spawnY = height / 4 + Math.random() * (height / 2);
    state.enemyBrawler.pos = new Vector(spawnX, spawnY);
    state.enemyBrawler.vel.mult(0);

    updateProfileUI();
    state.isPlaying = true;
    logCombat(state.enemyBrawler.isRevenge ? 'Revenge Battle: Survive!' : 'Zenkai Battle: Fight!');
}

export function triggerWin(isAbsorb = false) {
    state.score++;
    let difficulty = 1 + Math.floor(state.score / 2);
    state.evolutionPoints += difficulty;
    renderSkillTree();
    logCombat(`Victory! Gained ${difficulty} EV Points!`);

    state.screenShake = 30;
    state.hitStopFrames = 15;
    state.isPlaying = false; 
    updateProfileUI();
    
    setTimeout(() => {
        if (isAbsorb) showAbsorbSelect();
        else showUpgradeSelect(false);
    }, 1500);
}

// ========================
// CORE ENGINE LOOP
// ========================

function updateGameLogic() {
    if (!state.isPlaying) return;

    if (state.hitStopFrames > 0) {
        state.hitStopFrames--;
        return; 
    }

    state.currentArena.update();

    const activeBrawlers = [state.blueBrawler, state.enemyBrawler].filter(b => b);
    const allProjectiles =[...state.kiBlasts, ...state.homingBlasts, ...state.kiBalls, ...state.kiGrenades, ...state.beams];

    activeBrawlers.forEach(b => {
        if (b.isDead) return;
        let opponent = b.isPlayer ? state.enemyBrawler : state.blueBrawler;

        // --- BURST AUTO-REFLEX SYSTEM ---
        if (b.hasBurst && b.burstCd <= 0 && b.ki >= 15) {
            let danger = false;
            state.beams.forEach(beam => {
                if (beam.active && beam.brawler !== b) {
                    let dummyTarget = { pos: b.pos, radius: 150 }; 
                    if (beam.checkCollision(dummyTarget)) danger = true;
                }
            });
            if (!danger) {
                allProjectiles.forEach(p => {
                    if (p.active && p.brawler !== b && !(p instanceof EnergyBeam)) {
                        let dist = Vector.dist(b.pos, p.pos);
                        if (dist < 250 && p.vel && p.vel.mag() > 5) {
                            let toBrawler = Vector.sub(b.pos, p.pos).normalize();
                            if (p.vel.copy().normalize().dot(toBrawler) > 0.6) danger = true;
                        }
                    }
                });
            }
            if (danger) {
                b.burstTimer = 15;
                b.burstCd = 300;
                b.ki -= 15;
                logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} AUTO-BURST deflected incoming attack!`);
            }
        }

        if (b.burstTimer > 0) { 
            if (b.burstTimer === 15) state.screenShake = Math.max(state.screenShake, 10);
            
            allProjectiles.forEach(p => {
                if (!p.active) return;
                if (p instanceof EnergyBeam) {
                    let dummyTarget = { pos: b.pos, radius: 150 }; 
                    if (p.brawler !== b && p.checkCollision(dummyTarget)) {
                        p.active = false; 
                        spawnExplosion(b.pos.x, b.pos.y, p.color, 10, 2);
                    }
                } else {
                    if (Vector.dist(b.pos, p.pos) < 150 && p.brawler !== b) {
                        p.vel.mult(-1.5); 
                        p.brawler = b; 
                        p.isPlayer = b.isPlayer;
                        p.color = b.color;
                    }
                }
            });
            
            if (opponent && Vector.dist(b.pos, opponent.pos) < 150) {
                let push = Vector.sub(opponent.pos, b.pos).normalize().mult(b.burstTimer === 15 ? 20 : 2);
                opponent.vel.add(push);
                opponent.stunTimer = Math.max(opponent.stunTimer, 20);
            }
        }

        // --- SKILLS: CHOKE, THROW, WOLF RUSH, SSJ, BUFFS... (Delegated internally inside Brawler updates) ---
        // (Transformation logics remain inside brawler instance tick processing)
        if (b.wantsToSSJ) {
            b.wantsToSSJ = false; b.usedSSJ = true; b.ki = 0; b.isTransformingSSJ = 90; 
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} is transforming...`);
        }
        if (b.isTransformingSSJ > 0) {
            spawnExplosion(b.pos.x, b.pos.y, '#FFFFFF', 1, 3); 
            if (opponent && Vector.dist(opponent.pos, b.pos) < 300) opponent.vel.add(Vector.sub(opponent.pos, b.pos).normalize().mult(1.5)); 
            if (b.isTransformingSSJ === 1) {
                b.ssjTimer = 1800; spawnExplosion(b.pos.x, b.pos.y, '#FFDC00', 50, 4);
                state.screenShake = Math.max(state.screenShake, 20); logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} SUPER SAIYAN!`);
            }
        }
        if (b.wantsToPowerBoost) {
            b.wantsToPowerBoost = false; b.usedPowerBoost = true; b.powerBoostTimer = 1200; 
            spawnExplosion(b.pos.x, b.pos.y, '#FFFFFF', 30, 2); state.screenShake = Math.max(state.screenShake, 10);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} activated POWER BOOST!`);
        }
        if (b.wantsToFSSJ) {
            b.wantsToFSSJ = false; b.usedFSSJ = true; b.fssjTimer = 1200; 
            spawnExplosion(b.pos.x, b.pos.y, '#FF8C00', 30, 2); state.screenShake = Math.max(state.screenShake, 10);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} FALSE SUPER SAIYAN!`);
        }
        if (b.wantsToKaioken) {
            b.wantsToKaioken = false; b.usedKaioken = true; b.kaiokenTimer = 900; 
            spawnExplosion(b.pos.x, b.pos.y, '#FF0000', 20, 2); state.screenShake = Math.max(state.screenShake, 8);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} KAIOKEN x5!`);
        }

        // --- PROJECTILE SPAWNING ---
        if (b.tpRequests && b.tpRequests.length > 0) {
            b.tpRequests.forEach(req => {
                spawnTeleportLines(req.from.x, req.from.y, b.color);
                spawnTeleportLines(req.to.x, req.to.y, b.color);
            });
            b.tpRequests =[];
        }

        if (b.wantsToShoot && b.ki >= 15) {
            b.ki -= 15; b.wantsToShoot = false;
            let spawnPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + 15));
            state.kiBlasts.push(new KiBlast(spawnPos.x, spawnPos.y, b.lookDir, b.color, b.isPlayer));
        }

        if (b.wantsToGrenade && opponent) {
            b.wantsToGrenade = false;
            let toOpp = Vector.sub(opponent.pos, b.pos).normalize();
            for(let i=0; i<12; i++) { 
                let spawnPos = Vector.add(b.pos, toOpp.copy().mult(b.radius + 15));
                state.kiGrenades.push(new KiGrenade(spawnPos.x, spawnPos.y, toOpp, b.color, b.isPlayer));
            }
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} scattered a Grenade Barrage!`);
        }

        if (b.wantsToKiArrows && opponent) {
            b.wantsToKiArrows = false;
            let toOpp = Vector.sub(opponent.pos, b.pos).normalize();
            for(let i=-1; i<=1; i++) { 
                let spawnPos = Vector.add(b.pos, toOpp.copy().mult(b.radius + 15));
                state.homingBlasts.push(new HomingKiBlast(spawnPos.x, spawnPos.y, toOpp.copy().rotate(i * 0.5), b.color, b.isPlayer, opponent));
            }
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} fired Ki Arrows!`);
        }

        if (b.wantsToKiBall) {
            b.wantsToKiBall = false;
            let spawnPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + 20));
            state.kiBalls.push(new KiBall(spawnPos.x, spawnPos.y, b.lookDir, b.color, b.isPlayer));
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} threw a Ki Ball!`);
        }

        if (b.wantsToBeam && b.ki >= 50) {
            b.ki -= 50; b.wantsToBeam = false; b.beamTimer = 60; b.attackLockout = 60;
            state.beams.push(new EnergyBeam(b));
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} fired an ENERGY BEAM!`);
            state.screenShake = Math.max(state.screenShake, 8);
        }
    });

    checkObstacleCollisions();

    // Update Arrays
    for (let i = state.kiBlasts.length - 1; i >= 0; i--) {
        let blast = state.kiBlasts[i]; blast.update();
        if (blast.pos.x < 0 || blast.pos.x > width || blast.pos.y < 0 || blast.pos.y > height || blast.life <= 0) {
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            state.kiBlasts.splice(i, 1); continue;
        }
        let target = blast.isPlayer ? state.enemyBrawler : state.blueBrawler;
        if (target && Vector.dist(blast.pos, target.pos) < target.radius + blast.radius) {
            if (target.burstTimer <= 0 && !target.isDead) {
                if (target.isBlocking > 0) target.vel.add(blast.vel.copy().normalize().mult(1.5));
                else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                    target.health -= 0.5; target.vel.add(blast.vel.copy().normalize().mult(3));
                    target.stunTimer = Math.max(target.stunTimer, 15); target.invulnTimer = 10;
                    spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 15, 1);
                }
            }
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            state.kiBlasts.splice(i, 1);
        }
    }

    for (let i = state.homingBlasts.length - 1; i >= 0; i--) {
        let blast = state.homingBlasts[i]; blast.update();
        if (blast.pos.x < 0 || blast.pos.x > width || blast.pos.y < 0 || blast.pos.y > height || blast.life <= 0) {
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            state.homingBlasts.splice(i, 1); continue;
        }
        let target = blast.isPlayer ? state.enemyBrawler : state.blueBrawler;
        if (target && Vector.dist(blast.pos, target.pos) < target.radius + blast.radius) {
            if (target.burstTimer <= 0 && !target.isDead) {
                if (target.isBlocking > 0) target.vel.add(blast.vel.copy().normalize().mult(1.0));
                else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                    target.health -= 0.8; target.vel.add(blast.vel.copy().normalize().mult(2));
                    target.stunTimer = Math.max(target.stunTimer, 10);
                    spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 10, 1);
                }
            }
            state.homingBlasts.splice(i, 1);
        }
    }

    for (let i = state.kiBalls.length - 1; i >= 0; i--) {
        let ball = state.kiBalls[i]; ball.update();
        if (ball.pos.x < 0 || ball.pos.x > width || ball.pos.y < 0 || ball.pos.y > height || ball.life <= 0) {
            spawnExplosion(ball.pos.x, ball.pos.y, ball.color, 20, 2.0);
            state.kiBalls.splice(i, 1); continue;
        }
        let target = ball.isPlayer ? state.enemyBrawler : state.blueBrawler;
        if (target && Vector.dist(ball.pos, target.pos) < target.radius + ball.radius) {
            if (target.burstTimer <= 0 && !target.isDead) {
                if (target.isBlocking > 0) { target.health -= 2.0; target.vel.add(ball.vel.copy().normalize().mult(5)); }
                else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                    target.health -= 6.0; target.vel.add(ball.vel.copy().normalize().mult(15));
                    target.stunTimer = Math.max(target.stunTimer, 40);
                }
                spawnExplosion(ball.pos.x, ball.pos.y, ball.color, 50, 4);
                state.screenShake = Math.max(state.screenShake, 15);
            }
            state.kiBalls.splice(i, 1);
        }
    }

    for (let i = state.kiGrenades.length - 1; i >= 0; i--) {
        let g = state.kiGrenades[i]; g.update();
        let target = g.isPlayer ? state.enemyBrawler : state.blueBrawler;

        if (g.detonating) {
            if (target && g.detonateTimer === 1 && !target.isDead && Vector.dist(g.pos, target.pos) < g.radius + target.radius + 20) {
                if (target.burstTimer <= 0) {
                    if (target.isBlocking > 0) target.health -= 1.0;
                    else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                        target.health -= 3.0; target.vel.add(Vector.sub(target.pos, g.pos).normalize().mult(10));
                        target.stunTimer = Math.max(target.stunTimer, 20);
                    }
                }
                state.screenShake = Math.max(state.screenShake, 5);
            }
            if (!g.active) state.kiGrenades.splice(i, 1);
            continue;
        }

        if (g.pos.x < 0 || g.pos.x > width || g.pos.y < 0 || g.pos.y > height || (target && !target.isDead && Vector.dist(g.pos, target.pos) < target.radius + 60)) {
            g.detonating = true; g.vel.mult(0); 
        }
    }

    for (let i = state.beams.length - 1; i >= 0; i--) {
        let beam = state.beams[i]; beam.update();
        if (!beam.active) state.beams.splice(i, 1);
    }

    state.beams.forEach(b => b.clashPoint = null);
    for (let i = 0; i < state.beams.length; i++) {
        for (let j = i + 1; j < state.beams.length; j++) {
            let b1 = state.beams[i]; let b2 = state.beams[j];
            if (b1.brawler !== b2.brawler) {
                let p0 = b1.getStartPos(); let p1 = b1.getRawEndPos();
                let p2 = b2.getStartPos(); let p3 = b2.getRawEndPos();
                let intersect = getSegmentIntersection(p0, p1, p2, p3);

                if (!intersect && Vector.dist(p0, p2) < b1.currentLength + b2.currentLength && b1.brawler.lookDir.dot(b2.brawler.lookDir) < -0.5) {
                    let ratio = b1.currentLength / (b1.currentLength + b2.currentLength);
                    intersect = Vector.add(p0, Vector.sub(p2, p0).mult(ratio));
                }
                if (intersect) {
                    b1.clashPoint = intersect; b2.clashPoint = intersect;
                    spawnExplosion(intersect.x, intersect.y, '#FFFFFF', 3, 2);
                    spawnExplosion(intersect.x, intersect.y, b1.color, 2, 3);
                    spawnExplosion(intersect.x, intersect.y, b2.color, 2, 3);
                    state.screenShake = Math.max(state.screenShake, 5);
                }
            }
        }
    }

    for (let i = 0; i < state.beams.length; i++) {
        let beam = state.beams[i];
        let target = beam.brawler.isPlayer ? state.enemyBrawler : state.blueBrawler;
        if (target && !target.isDead && target.burstTimer <= 0 && beam.checkCollision(target)) {
            if (target.isBlocking > 0) { target.health -= 0.5; target.vel.add(beam.brawler.lookDir.copy().mult(1)); }
            else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                target.health -= 2.0; target.vel.add(beam.brawler.lookDir.copy().mult(3));
                target.stunTimer = Math.max(target.stunTimer, 10);
                spawnExplosion(target.pos.x, target.pos.y, beam.color, 10, 1.5);
                state.screenShake = Math.max(state.screenShake, 5);
            }
        }
    }

    // Process movements and core combat AI
    if (state.blueBrawler && !state.blueBrawler.isDead) state.blueBrawler.applyForce(state.blueBrawler.getSteering(state.enemyBrawler, width, height, allProjectiles, state.currentArena.obstacles));
    if (state.enemyBrawler && !state.enemyBrawler.isDead) state.enemyBrawler.applyForce(state.enemyBrawler.getSteering(state.blueBrawler, width, height, allProjectiles, state.currentArena.obstacles));
    else if (state.enemyBrawler) state.enemyBrawler.vel.mult(0.8);

    if (state.blueBrawler && !state.blueBrawler.isDead && state.enemyBrawler && !state.enemyBrawler.isDead) {
        handleCombat(width, height);
    }

    if (state.blueBrawler) state.blueBrawler.update(width, height);
    if (state.enemyBrawler) state.enemyBrawler.update(width, height);
    
    updateProfileUI();

    // End State Check: Enemy Death
    if (state.enemyBrawler && state.enemyBrawler.health <= 0 && !state.enemyBrawler.isDead) {
        state.enemyBrawler.isDead = true; 
        state.enemyBrawler.stunTimer = 9999;
        state.enemyBrawler.attackLockout = 9999;
        state.enemyBrawler.wantsToShoot = false;
        state.enemyBrawler.wantsToBeam = false;
        
        showFateSelection();
    }

    if (state.enemyBrawler && state.enemyBrawler.isDead) {
        state.enemyBrawler.vel.mult(0.5); 
        if (state.blueBrawler.absorbTimer <= 0 && state.blueBrawler.absorbTarget) {
            state.blueBrawler.absorbTarget = null;
            spawnExplosion(state.enemyBrawler.pos.x, state.enemyBrawler.pos.y, state.blueBrawler.color, 50, 3);
            triggerWin(true);
        }
    }

    // End State Check: Player Death
    if (state.blueBrawler && state.blueBrawler.health <= 0 && !state.blueBrawler.isDead) {
        state.blueBrawler.isDead = true;
        
        if (state.senzuBeans > 0) {
            state.senzuBeans--;
            logCombat(`Defeated! Ate a Senzu Bean! (${state.senzuBeans} left)`);
            spawnExplosion(state.blueBrawler.pos.x, state.blueBrawler.pos.y, '#2ECC40', 40, 3.0); 
            state.screenShake = 35;
            state.hitStopFrames = 15;
            state.isPlaying = false;
            updateProfileUI();
            
            setTimeout(() => { showUpgradeSelect(true); }, 1500);
            
        } else {
            spawnExplosion(state.blueBrawler.pos.x, state.blueBrawler.pos.y, state.blueBrawler.color, 80, 4.0);
            state.screenShake = 35;
            state.hitStopFrames = 15;
            state.isPlaying = false;
            updateProfileUI();
            logCombat('You were defeated! Skill tree reset.');
            
            resetSkillTree(); 
            setTimeout(showRaceSelect, 2000);
        }
    }
}

function gameLoop() {
    updateGameLogic();

    for (let i = state.particles.length - 1; i >= 0; i--) {
        state.particles[i].update();
        if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    ctx.save();
    
    if (state.screenShake > 0.5) {
        let dx = (Math.random() - 0.5) * state.screenShake;
        let dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
        state.screenShake *= 0.9; 
    }

    ctx.clearRect(0, 0, width, height);
    
    if (state.currentArena) state.currentArena.draw(ctx);
    
    if (state.currentMode === 'ZENKAI' && state.blueBrawler && state.enemyBrawler) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${state.score}`, width / 2, height / 2 + 30);
    }
    
    if (state.enemyBrawler && state.enemyBrawler.health > 0 || (state.enemyBrawler && state.enemyBrawler.isDead && state.blueBrawler && state.blueBrawler.absorbTarget === state.enemyBrawler)) {
        state.enemyBrawler.draw(ctx);
    }

    if (state.blueBrawler && state.blueBrawler.health > 0) state.blueBrawler.draw(ctx);

    state.kiBlasts.forEach(b => b.draw(ctx));
    state.homingBlasts.forEach(b => b.draw(ctx));
    state.kiBalls.forEach(b => b.draw(ctx));
    state.kiGrenades.forEach(g => g.draw(ctx));
    state.beams.forEach(b => b.draw(ctx));
    state.particles.forEach(p => p.draw(ctx));

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// Initialize Application
initUIEvents();
initSkillTreeEvents();
renderSkillTree();
showRaceSelect();
requestAnimationFrame(gameLoop);
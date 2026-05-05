import { Vector } from './vector.js';
import { Brawler } from './brawler.js';
import { RACES, getRandomRaces } from './races.js';
import { Particle, TeleportLine, KiBlast, EnergyBeam } from './particle.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let blueBrawler;
let enemyBrawler;
let score = 0;

let isPlaying = false;
let hitStopFrames = 0;
let screenShake = 0;

let particles =[];
let kiBlasts = [];
let beams =[];

let playerSelectedRace = null;

const ENEMY_COLORS =['#FF4136', '#2ECC40', '#FF851B', '#B10DC9', '#FFDC00', '#F012BE'];
const STYLES =['Quick Fist', 'Pummel', 'High Kicks'];

// ========================
// META-PROGRESSION & SKILL TREE
// ========================
let evolutionPoints = 0;
const MAX_EQUIPPED_SKILLS = 3;

// Skill definitions and states
const SKILL_TREE = {
    root: { id: 'root', label: 'Awaken', category: 'CORE', cost: 0, x: 400, y: 400, parent: null, unlocked: true, equipped: false, desc: "The beginning." },
    ki_beam: { id: 'ki_beam', label: 'Energy Beam', category: 'KI', cost: 2, x: 400, y: 220, parent: 'root', unlocked: false, equipped: false, desc: "Active: Fire a massive sustained beam (Cost: 50 Ki)." },
    str_1: { id: 'str_1', label: 'Brute Force', category: 'STR', cost: 1, x: 570, y: 340, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +2.0 Base Damage." },
    race_1: { id: 'race_1', label: 'Racial Pride', category: 'RACE', cost: 3, x: 510, y: 530, parent: 'root', unlocked: false, equipped: false, desc: "Passive: Enhances your racial stat multipliers by 20%." },
    race_2: { id: 'race_2', label: 'False Super Saiyan', category: 'RACE', cost: 4, x: 580, y: 660, parent: 'race_1', unlocked: false, equipped: false, desc: "Active (Saiyan Only): +Speed/Strength for 20s. Take more damage, block/dodge less. (Once per match)" },
    con_1: { id: 'con_1', label: 'Iron Skin', category: 'CON', cost: 1, x: 290, y: 530, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +20 Base Max HP." },
    con_2: { id: 'con_2', label: 'Kaioken x5', category: 'CON', cost: 3, x: 220, y: 660, parent: 'con_1', unlocked: false, equipped: false, desc: "Active: x2.5 Damage, lose 1 HP/sec. Lasts 15s. (Once per match)" },
    spd_1: { id: 'spd_1', label: 'Swift Steps', category: 'SPD', cost: 1, x: 230, y: 340, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +1.5 Base Speed." }
};

// Skill tree panning state
let treePan = { x: -250, y: -250 };
let isDraggingTree = false;
let startDrag = { x: 0, y: 0 };

function getEquippedCount() {
    return Object.values(SKILL_TREE).filter(s => s.equipped && s.id !== 'root').length;
}

function getEquippedSkillIDs() {
    return Object.values(SKILL_TREE).filter(s => s.equipped && s.id !== 'root').map(s => s.id);
}

function resetSkillTree() {
    evolutionPoints = 0;
    Object.values(SKILL_TREE).forEach(node => {
        if (node.id !== 'root') {
            node.unlocked = false;
            node.equipped = false;
        }
    });
    renderSkillTree();
}

// Update DOM for the Tree
function renderSkillTree() {
    const nodesContainer = document.getElementById('tree-nodes');
    const svgLines = document.getElementById('tree-lines');
    
    nodesContainer.innerHTML = '';
    svgLines.innerHTML = '';

    // Update Text UI
    document.getElementById('ui-ev-points').innerText = evolutionPoints;
    document.getElementById('ui-equipped-slots').innerText = `${getEquippedCount()} / ${MAX_EQUIPPED_SKILLS}`;

    Object.values(SKILL_TREE).forEach(node => {
        // Draw lines to parent
        if (node.parent) {
            let parentNode = SKILL_TREE[node.parent];
            let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', parentNode.x);
            line.setAttribute('y1', parentNode.y);
            line.setAttribute('x2', node.x);
            line.setAttribute('y2', node.y);
            
            let lineClass = 'tree-line';
            if (node.equipped) lineClass += ' equipped';
            else if (node.unlocked) lineClass += ' unlocked';
            
            line.setAttribute('class', lineClass);
            svgLines.appendChild(line);
        }

        // Create DOM node
        let el = document.createElement('div');
        let classStr = 'node';
        if (node.id === 'root') classStr += ' root';
        else if (node.equipped) classStr += ' equipped';
        else if (node.unlocked) classStr += ' unlocked';
        
        el.className = classStr;
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';
        el.innerText = node.category;

        // Tooltip
        let tooltip = document.createElement('div');
        tooltip.className = 'node-tooltip';
        tooltip.innerHTML = `<h4>${node.label}</h4><p>${node.desc}</p>`;
        
        if (node.id !== 'root') {
            if (!node.unlocked) tooltip.innerHTML += `<span>Cost: ${node.cost} EV</span>`;
            else if (node.equipped) tooltip.innerHTML += `<span style="color: #01FF70;">Equipped</span>`;
            else tooltip.innerHTML += `<span style="color: #7FDBFF;">Unlocked (Click to Equip)</span>`;
        }

        el.appendChild(tooltip);

        // Click Handler
        el.onmousedown = (e) => e.stopPropagation(); 
        el.onclick = () => handleNodeClick(node.id);
        
        nodesContainer.appendChild(el);
    });

    document.getElementById('tree-canvas').style.transform = `translate(${treePan.x}px, ${treePan.y}px)`;
}

function handleNodeClick(nodeId) {
    let node = SKILL_TREE[nodeId];
    if (node.id === 'root') return;

    // Racial Lock Check
    if (node.id === 'race_2' && (!blueBrawler || blueBrawler.raceName !== 'Saiyan')) {
        logCombat('Unlock Failed: Exclusive to Saiyans!');
        return;
    }

    if (!node.unlocked) {
        // Attempt unlock
        let parentNode = SKILL_TREE[node.parent];
        if (!parentNode.unlocked) {
            logCombat('Parent node must be unlocked first!');
            return;
        }
        if (evolutionPoints >= node.cost) {
            evolutionPoints -= node.cost;
            node.unlocked = true;
            logCombat(`Unlocked: ${node.label}`);
        } else {
            logCombat('Not enough EV Points!');
        }
    } else {
        // Attempt equip/unequip
        if (node.equipped) {
            node.equipped = false;
            logCombat(`Unequipped: ${node.label}`);
        } else {
            if (getEquippedCount() < MAX_EQUIPPED_SKILLS) {
                node.equipped = true;
                logCombat(`Equipped: ${node.label}`);
            } else {
                logCombat('Equip limit reached!');
            }
        }
    }

    renderSkillTree();
    
    // Apply actively to the brawler if currently playing
    if (blueBrawler) {
        blueBrawler.updateStats(getEquippedSkillIDs());
        updateProfileUI();
    }
}

// Tree Mouse Interaction
const viewport = document.getElementById('tree-viewport');
viewport.addEventListener('mousedown', (e) => {
    isDraggingTree = true;
    startDrag.x = e.clientX - treePan.x;
    startDrag.y = e.clientY - treePan.y;
});

viewport.addEventListener('mousemove', (e) => {
    if (!isDraggingTree) return;
    treePan.x = e.clientX - startDrag.x;
    treePan.y = e.clientY - startDrag.y;
    document.getElementById('tree-canvas').style.transform = `translate(${treePan.x}px, ${treePan.y}px)`;
});

viewport.addEventListener('mouseup', () => isDraggingTree = false);
viewport.addEventListener('mouseleave', () => isDraggingTree = false);


// ========================
// UPGRADE DEFINITIONS
// ========================
const UPGRADES =[
    { name: "Sharpened Strikes", desc: "Increase base damage by 2.", apply: (p) => { p.baseDamage += 2; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Iron Will", desc: "Increase base Max HP by 20 and heal.", apply: (p) => { p.baseMaxHealth += 20; p.updateStats(getEquippedSkillIDs()); p.health += 20; } },
    { name: "Agility Training", desc: "Increase base Speed by 1.5.", apply: (p) => { p.baseMaxSpeed += 1.5; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Heavy Weight", desc: "Increase base Knockback by 10.", apply: (p) => { p.baseKnockback += 10; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Full Restore", desc: "Heal back to 100% HP.", apply: (p) => p.health = p.maxHealth },
    { name: "Vampirism", desc: "Heal 5 HP instantly.", apply: (p) => p.health = Math.min(p.maxHealth, p.health + 5) }
];

// ========================
// UI & GAME STATE LOGIC
// ========================

function logCombat(msg) {
    const log = document.getElementById('combat-log');
    log.innerHTML = `<p>${msg}</p>`;
}

function updateProfileUI() {
    if (!blueBrawler) return;
    
    document.getElementById('ui-race').innerText = blueBrawler.raceName;
    document.getElementById('ui-style').innerText = blueBrawler.style;
    
    let hpStr = `${Math.ceil(Math.max(0, blueBrawler.health))} / ${Math.ceil(blueBrawler.maxHealth)}`;
    document.getElementById('ui-hp').innerText = hpStr;
    document.getElementById('ui-hp-fill').style.width = `${Math.max(0, blueBrawler.health / blueBrawler.maxHealth) * 100}%`;

    let kiStr = `${Math.floor(blueBrawler.ki)} / ${blueBrawler.maxKi}`;
    document.getElementById('ui-ki').innerText = kiStr;
    document.getElementById('ui-ki-fill').style.width = `${Math.max(0, blueBrawler.ki / blueBrawler.maxKi) * 100}%`;

    document.getElementById('ui-dmg').innerText = blueBrawler.getEffectiveDamage().toFixed(1);
    document.getElementById('ui-spd').innerText = blueBrawler.getEffectiveSpeed().toFixed(1);
    document.getElementById('ui-kb').innerText = blueBrawler.knockback.toFixed(1);

    let blockSecs = Math.max(0, (blueBrawler.blockCooldown / 60)).toFixed(1);
    document.getElementById('ui-block').innerText = blockSecs > 0 ? `${blockSecs}s` : "READY";
}

function showRaceSelect() {
    isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const raceModal = document.getElementById('race-selection');
    const raceOptions = document.getElementById('race-options');
    
    uiLayer.classList.remove('hidden');
    raceModal.classList.remove('hidden');
    document.getElementById('upgrade-selection').classList.add('hidden');
    
    raceOptions.innerHTML = '';
    logCombat('Select your fighter.');
    
    let choices = getRandomRaces(3);
    choices.forEach(race => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${race.name}</h3><p>${race.desc}</p>`;
        
        btn.onclick = () => {
            playerSelectedRace = race.name;
            uiLayer.classList.add('hidden');
            raceModal.classList.add('hidden');
            startGame();
        };
        raceOptions.appendChild(btn);
    });
}

function showUpgradeSelect() {
    isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const upgradeModal = document.getElementById('upgrade-selection');
    const upgradeOptions = document.getElementById('upgrade-options');
    
    uiLayer.classList.remove('hidden');
    upgradeModal.classList.remove('hidden');
    document.getElementById('race-selection').classList.add('hidden');
    
    upgradeOptions.innerHTML = '';
    
    let shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
    let choices = shuffled.slice(0, 3);
    
    choices.forEach(upgrade => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${upgrade.name}</h3><p>${upgrade.desc}</p>`;
        
        btn.onclick = () => {
            upgrade.apply(blueBrawler);
            updateProfileUI();
            uiLayer.classList.add('hidden');
            upgradeModal.classList.add('hidden');
            
            spawnEnemy();
            isPlaying = true;
            logCombat('A new challenger approaches!');
        };
        upgradeOptions.appendChild(btn);
    });
}

function startGame() {
    score = 0;
    particles =[];
    kiBlasts = [];
    beams =[];
    spawnPlayer();
    spawnEnemy();
    updateProfileUI();
    isPlaying = true;
    logCombat('Fight!');
}

// ========================
// ENTITY SPAWNING & FX
// ========================

function spawnPlayer() {
    let style = STYLES[Math.floor(Math.random() * STYLES.length)];
    blueBrawler = new Brawler(width / 4, height / 2, '#0074D9', true, style, playerSelectedRace);
    blueBrawler.updateStats(getEquippedSkillIDs());
}

function spawnEnemy() {
    let color = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
    let style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let allRaces = Object.keys(RACES);
    let randomRace = allRaces[Math.floor(Math.random() * allRaces.length)];

    let spawnX = blueBrawler.pos.x > width / 2 ? width / 4 : (width / 4) * 3;
    let spawnY = height / 4 + Math.random() * (height / 2);
    
    enemyBrawler = new Brawler(spawnX, spawnY, color, false, style, randomRace);
    
    // Harder enemies naturally possess skills
    let enemySkills =[];
    if (score >= 2 && Math.random() < 0.4) enemySkills.push('ki_beam');
    if (score >= 3 && Math.random() < 0.3) enemySkills.push('con_2'); // Kaioken
    if (score >= 4 && randomRace === 'Saiyan' && Math.random() < 0.5) enemySkills.push('race_2'); // FSSJ
    enemyBrawler.updateStats(enemySkills);

    let scaleFactor = Math.min(1.0, 0.5 + (score * 0.15));
    
    enemyBrawler.maxHealth *= scaleFactor;
    enemyBrawler.health = enemyBrawler.maxHealth;
    enemyBrawler.damage *= scaleFactor;
    enemyBrawler.knockback *= scaleFactor;
    enemyBrawler.maxSpeed *= (0.8 + (scaleFactor * 0.2)); 
}

function spawnExplosion(x, y, color, count, speedMult = 1) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, speedMult));
    }
}

function spawnTeleportLines(x, y, color) {
    for(let i = 0; i < 8; i++) {
        particles.push(new TeleportLine(x, y, color));
    }
}

// ========================
// RENDER & COMBAT LOGIC
// ========================

function drawArena() {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 150, 0, Math.PI * 2);
    ctx.stroke();
    
    if (blueBrawler && enemyBrawler) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${score}`, width / 2, height / 2 + 30);
    }
}

function calculateHitEffects(attacker, defender, pushDir, hitQuality) {
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

    // FSSJ defensively lowers resistance
    if (defender.fssjTimer > 0) {
        finalDmg *= 1.3; 
    }

    let kbVec = pushDir.copy().mult(attacker.knockback * kbMult);

    if (defender.isBlocking > 0) {
        blocked = true;
        finalDmg *= 0.1; 
        logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} BLOCKED!`);
    } else {
        if (defender.raceName === 'Froster') {
            if (defender.cruelDodgeTimer > 0) {
                dodged = true;
                defender.cruelDodgeTimer = 0;
                logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} Froster DODGED!`);
            } else if (Math.random() < 0.10) {
                ignoreKB = true;
                defender.cruelDodgeTimer = 60; 
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

            // Stunned a bit longer when taking damage in FSSJ due to zero guard
            if (defender.fssjTimer > 0) stunFrames += 5;

            if (defender.raceName === 'Human' && defender.lastHitByStyle === attacker.style) {
                finalDmg *= 0.5;
                logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} Human ADAPTED!`);
            }
            if (defender.raceName === 'Namekian') {
                let missingPercent = Math.max(0, 1 - (defender.health / defender.maxHealth));
                finalDmg *= (1 - 0.5 * missingPercent); 
            }
            
            defender.lastHitByStyle = attacker.style;

            if (ignoreKB) {
                kbVec = new Vector(0, 0);
            }
        }
    }

    return { damage: finalDmg, kb: kbVec, dodged: dodged, blocked: blocked, stunFrames: stunFrames, isComboFinisher: isFinisher };
}

function tryTeleportCounter(defender, attacker) {
    let tpChance = defender.fssjTimer > 0 ? 0.05 : 0.20; // 75% less likely during FSSJ
    if (defender.tpCooldown <= 0 && Math.random() < tpChance) {
        let tpTarget = attacker.pos.copy().add(attacker.lookDir.copy().mult(-70));
        tpTarget.x = Math.max(defender.radius + 20, Math.min(width - defender.radius - 20, tpTarget.x));
        tpTarget.y = Math.max(defender.radius + 20, Math.min(height - defender.radius - 20, tpTarget.y));
        
        defender.triggerTeleport(tpTarget);
        defender.lookTarget = attacker.pos.copy();
        defender.attackLockout = 0; 
        logCombat(`${defender.isPlayer ? 'Player' : 'Enemy'} TELEPORT COUNTER!`);
    }
}

function handleCombat() {
    let dist = Vector.dist(blueBrawler.pos, enemyBrawler.pos);
    let minDist = blueBrawler.radius + enemyBrawler.radius;

    if (dist < minDist) {
        let overlap = minDist - dist;
        if (dist === 0) { dist = 1; blueBrawler.pos.x += 1; }
        let pushDir = Vector.sub(enemyBrawler.pos, blueBrawler.pos).normalize();
        
        blueBrawler.pos.sub(pushDir.copy().mult(overlap * 0.05));
        enemyBrawler.pos.add(pushDir.copy().mult(overlap * 0.05));

        let blueToEnemy = pushDir; 
        let enemyToBlue = pushDir.copy().mult(-1);
        
        let blueFacingEnemy = blueBrawler.lookDir.dot(blueToEnemy) > 0.3;
        let enemyFacingBlue = enemyBrawler.lookDir.dot(enemyToBlue) > 0.3;

        let blueCanAttack = blueBrawler.invulnTimer === 0 && blueBrawler.attackLockout === 0 && blueBrawler.stunTimer === 0 && blueBrawler.beamTimer <= 0;
        let enemyCanAttack = enemyBrawler.invulnTimer === 0 && enemyBrawler.attackLockout === 0 && enemyBrawler.stunTimer === 0 && enemyBrawler.beamTimer <= 0;

        let hit1 = null; 
        let hit2 = null; 
        let hitOccurred = false;
        let clashPoint = Vector.add(blueBrawler.pos, pushDir.copy().mult(blueBrawler.radius));

        if (blueFacingEnemy && blueCanAttack && enemyBrawler.invulnTimer === 0) {
            let hitQuality = blueToEnemy.dot(blueBrawler.lookDir);
            blueBrawler.comboCount++;
            
            hit1 = calculateHitEffects(blueBrawler, enemyBrawler, blueToEnemy, hitQuality);
            blueBrawler.attackLockout = blueBrawler.attackCooldown;
            enemyBrawler.invulnTimer = enemyBrawler.iframeDuration;
            hitOccurred = true;
            blueBrawler.triggerPunch();

            if (!hit1.dodged) {
                if (hit1.blocked) {
                    blueBrawler.comboCount = 0; 
                    spawnExplosion(clashPoint.x, clashPoint.y, '#AAAAAA', 8, 0.5);
                    hitStopFrames = Math.max(hitStopFrames, 2); 
                    
                    blueBrawler.vel.add(enemyToBlue.copy().mult(3));
                    enemyBrawler.vel.add(blueToEnemy.copy().mult(1));

                    tryTeleportCounter(enemyBrawler, blueBrawler);
                } else {
                    blueBrawler.comboTimer = 90; 
                    if (hit1.isComboFinisher) logCombat('P1: 4-HIT FINISHER!');
                    
                    enemyBrawler.squishX = 0.6;
                    enemyBrawler.squishY = 1.4;
                    enemyBrawler.squishAngle = Math.atan2(blueToEnemy.y, blueToEnemy.x);
                    enemyBrawler.stunTimer = Math.max(enemyBrawler.stunTimer, hit1.stunFrames);

                    spawnExplosion(clashPoint.x, clashPoint.y, enemyBrawler.color, hit1.isComboFinisher ? 30 : 6, hit1.isComboFinisher ? 3 : 1);
                    screenShake = Math.max(screenShake, hit1.isComboFinisher ? 15 : 2);
                    hitStopFrames = Math.max(hitStopFrames, hit1.isComboFinisher ? 10 : 2);
                }
            } else {
                blueBrawler.comboCount = 0;
                let dodgeZip = new Vector(-blueToEnemy.y, blueToEnemy.x).mult(Math.random() > 0.5 ? 1 : -1);
                enemyBrawler.pos.add(dodgeZip.copy().mult(12)); 
                enemyBrawler.vel = dodgeZip.copy().mult(6); 
                
                tryTeleportCounter(enemyBrawler, blueBrawler);
            }
        }

        if (enemyFacingBlue && enemyCanAttack && blueBrawler.invulnTimer === 0) {
            let hitQuality = enemyToBlue.dot(enemyBrawler.lookDir);
            enemyBrawler.comboCount++;

            hit2 = calculateHitEffects(enemyBrawler, blueBrawler, enemyToBlue, hitQuality);
            enemyBrawler.attackLockout = enemyBrawler.attackCooldown;
            blueBrawler.invulnTimer = blueBrawler.iframeDuration;
            hitOccurred = true;
            enemyBrawler.triggerPunch();

            if (!hit2.dodged) {
                if (hit2.blocked) {
                    enemyBrawler.comboCount = 0;
                    spawnExplosion(clashPoint.x, clashPoint.y, '#AAAAAA', 8, 0.5);
                    hitStopFrames = Math.max(hitStopFrames, 2);

                    enemyBrawler.vel.add(blueToEnemy.copy().mult(3));
                    blueBrawler.vel.add(enemyToBlue.copy().mult(1));

                    tryTeleportCounter(blueBrawler, enemyBrawler);
                } else {
                    enemyBrawler.comboTimer = 90;
                    if (hit2.isComboFinisher) logCombat('Enemy: 4-HIT FINISHER!');

                    blueBrawler.squishX = 0.6;
                    blueBrawler.squishY = 1.4;
                    blueBrawler.squishAngle = Math.atan2(enemyToBlue.y, enemyToBlue.x);
                    blueBrawler.stunTimer = Math.max(blueBrawler.stunTimer, hit2.stunFrames);

                    spawnExplosion(clashPoint.x, clashPoint.y, blueBrawler.color, hit2.isComboFinisher ? 30 : 6, hit2.isComboFinisher ? 3 : 1);
                    screenShake = Math.max(screenShake, hit2.isComboFinisher ? 15 : 2);
                    hitStopFrames = Math.max(hitStopFrames, hit2.isComboFinisher ? 10 : 2);
                }
            } else {
                enemyBrawler.comboCount = 0;
                let dodgeZip = new Vector(-enemyToBlue.y, enemyToBlue.x).mult(Math.random() > 0.5 ? 1 : -1);
                blueBrawler.pos.add(dodgeZip.copy().mult(12)); 
                blueBrawler.vel = dodgeZip.copy().mult(6); 

                tryTeleportCounter(blueBrawler, enemyBrawler);
            }
        }

        if (hit1) {
            enemyBrawler.health -= hit1.damage;
            if (!hit1.dodged && !hit1.blocked) enemyBrawler.vel.add(hit1.kb);
            updateProfileUI();
        }
        
        if (hit2) {
            blueBrawler.health -= hit2.damage;
            if (!hit2.dodged && !hit2.blocked) blueBrawler.vel.add(hit2.kb);
            updateProfileUI();
        }

        if (!hitOccurred) {
            blueBrawler.vel.sub(pushDir.copy().mult(0.2));
            enemyBrawler.vel.add(pushDir.copy().mult(0.2));
        }
    }
}

function updateGameLogic() {
    if (!isPlaying) return;

    if (hitStopFrames > 0) {
        hitStopFrames--;
        return; 
    }

    const activeBrawlers = [blueBrawler, enemyBrawler];
    activeBrawlers.forEach(b => {
        
        // Active Skill Trigger Processing
        if (b.wantsToFSSJ) {
            b.wantsToFSSJ = false;
            b.usedFSSJ = true;
            b.fssjTimer = 1200; // 20s
            spawnExplosion(b.pos.x, b.pos.y, '#FF8C00', 30, 2);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} triggered FALSE SUPER SAIYAN!`);
            screenShake = Math.max(screenShake, 10);
        }
        if (b.wantsToKaioken) {
            b.wantsToKaioken = false;
            b.usedKaioken = true;
            b.kaiokenTimer = 900; // 15s
            spawnExplosion(b.pos.x, b.pos.y, '#FF0000', 20, 2);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} activated KAIOKEN x5!`);
            screenShake = Math.max(screenShake, 8);
        }

        if (b.tpRequests && b.tpRequests.length > 0) {
            b.tpRequests.forEach(req => {
                spawnTeleportLines(req.from.x, req.from.y, b.color);
                spawnTeleportLines(req.to.x, req.to.y, b.color);
            });
            b.tpRequests =[];
        }

        if (b.wantsToShoot && b.ki >= 15) {
            b.ki -= 15;
            b.wantsToShoot = false;
            let spawnPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + 15));
            kiBlasts.push(new KiBlast(spawnPos.x, spawnPos.y, b.lookDir, b.color, b.isPlayer));
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} fired a Ki Blast!`);
        }

        // Firing sustained energy beam
        if (b.wantsToBeam && b.ki >= 50) {
            b.ki -= 50;
            b.wantsToBeam = false;
            b.beamTimer = 60; 
            b.attackLockout = 60;
            beams.push(new EnergyBeam(b));
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} fired an ENERGY BEAM!`);
            screenShake = Math.max(screenShake, 8);
        }
    });

    // Update Ki Blasts
    for (let i = kiBlasts.length - 1; i >= 0; i--) {
        let blast = kiBlasts[i];
        blast.update();

        if (blast.pos.x < 0 || blast.pos.x > width || blast.pos.y < 0 || blast.pos.y > height || blast.life <= 0) {
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            kiBlasts.splice(i, 1);
            continue;
        }

        let target = blast.isPlayer ? enemyBrawler : blueBrawler;
        if (Vector.dist(blast.pos, target.pos) < target.radius + blast.radius) {
            if (target.isBlocking > 0) {
                logCombat(`${target.isPlayer ? 'P1' : 'Enemy'} deflected Ki Blast!`);
                target.vel.add(blast.vel.copy().normalize().mult(1.5)); 
            } else if (target.isDodging > 0) {
                // Phased through
            } else if (target.invulnTimer <= 0) {
                target.health -= 0.5;
                target.vel.add(blast.vel.copy().normalize().mult(3));
                target.stunTimer = Math.max(target.stunTimer, 15);
                target.invulnTimer = 10;
                
                spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 15, 1);
                screenShake = Math.max(screenShake, 3);
            }
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            kiBlasts.splice(i, 1);
        }
    }

    // Update Energy Beams
    for (let i = beams.length - 1; i >= 0; i--) {
        let beam = beams[i];
        beam.update();
        if (!beam.active) {
            beams.splice(i, 1);
            continue;
        }

        let target = beam.brawler.isPlayer ? enemyBrawler : blueBrawler;
        if (beam.checkCollision(target)) {
            if (target.isBlocking > 0) {
                target.health -= 0.5; // Heavy chip damage through block
                target.vel.add(beam.brawler.lookDir.copy().mult(1));
            } else if (target.isDodging > 0) {
                // Phased through dodge
            } else if (target.invulnTimer <= 0) {
                target.health -= 2.0; // Sustained massive damage
                target.vel.add(beam.brawler.lookDir.copy().mult(3));
                target.stunTimer = Math.max(target.stunTimer, 10);
                
                spawnExplosion(target.pos.x, target.pos.y, beam.color, 10, 1.5);
                screenShake = Math.max(screenShake, 5);
            }
        }
    }

    blueBrawler.applyForce(blueBrawler.getSteering(enemyBrawler, width, height));
    enemyBrawler.applyForce(enemyBrawler.getSteering(blueBrawler, width, height));

    handleCombat();

    blueBrawler.update(width, height);
    enemyBrawler.update(width, height);
    
    updateProfileUI();

    // End Condition Handling
    if (enemyBrawler.health <= 0) {
        score++;
        
        let difficulty = 1 + Math.floor(score / 2);
        evolutionPoints += difficulty;
        renderSkillTree();
        logCombat(`Victory! Gained ${difficulty} EV Points!`);

        spawnExplosion(enemyBrawler.pos.x, enemyBrawler.pos.y, enemyBrawler.color, 80, 4.0);
        screenShake = 30;
        hitStopFrames = 15;
        isPlaying = false; 
        updateProfileUI();
        
        setTimeout(showUpgradeSelect, 1500);

    } else if (blueBrawler.health <= 0) {
        spawnExplosion(blueBrawler.pos.x, blueBrawler.pos.y, blueBrawler.color, 80, 4.0);
        screenShake = 35;
        hitStopFrames = 15;
        isPlaying = false;
        updateProfileUI();
        logCombat('You were defeated! Skill tree reset.');
        
        resetSkillTree(); // Clears all progress
        setTimeout(showRaceSelect, 2000);
    }
}

function gameLoop() {
    updateGameLogic();

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    ctx.save();
    
    if (screenShake > 0.5) {
        let dx = (Math.random() - 0.5) * screenShake;
        let dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9; 
    }

    ctx.clearRect(0, 0, width, height);
    drawArena();
    
    // Draw characters
    if (blueBrawler && blueBrawler.health > 0) blueBrawler.draw(ctx);
    if (enemyBrawler && enemyBrawler.health > 0) enemyBrawler.draw(ctx);

    // Draw projectiles
    kiBlasts.forEach(b => b.draw(ctx));
    beams.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Initial setup
renderSkillTree();
showRaceSelect();
requestAnimationFrame(gameLoop);
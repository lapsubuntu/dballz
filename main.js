

import { Vector } from './vector.js';
import { Brawler } from './brawler.js';
import { RACES, getRandomRaces } from './races.js';
import { Particle, TeleportLine, KiBlast, HomingKiBlast, KiBall, KiGrenade, EnergyBeam } from './particle.js';
import { Arena } from './arena.js';

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
let kiBlasts =[];
let homingBlasts =[];
let kiBalls =[];
let kiGrenades =[];
let beams =[];

let currentArena = new Arena('Desert', width, height);

let playerSelectedRace = null;

const ENEMY_COLORS =['#FF4136', '#2ECC40', '#FF851B', '#B10DC9', '#FFDC00', '#F012BE'];
const STYLES =['Quick Fist', 'Pummel', 'High Kicks'];

// ========================
// META-PROGRESSION & SKILL TREE
// ========================
let evolutionPoints = 0;
const MAX_EQUIPPED_SKILLS = 3;

const SKILL_TREE = {
    root: { id: 'root', label: 'Awaken', category: 'CORE', cost: 0, x: 400, y: 400, parent: null, unlocked: true, equipped: false, desc: "The beginning." },
    
    // STR Branch
    str_1: { id: 'str_1', label: 'Brute Force', category: 'STR', cost: 1, x: 570, y: 340, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +2.0 Base Damage." },
    str_2: { id: 'str_2', label: 'Choke', category: 'STR', cost: 2, x: 680, y: 280, parent: 'str_1', unlocked: false, equipped: false, desc: "Active: Grabs the enemy, punches repeatedly, and blasts them away." },
    str_3: { id: 'str_3', label: 'Dragon Throw', category: 'STR', cost: 3, x: 680, y: 400, parent: 'str_1', unlocked: false, equipped: false, desc: "Active: Grabs the enemy, spins violently, and throws them far away." },
    
    // SPD Branch
    spd_1: { id: 'spd_1', label: 'Swift Steps', category: 'SPD', cost: 1, x: 230, y: 340, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +1.5 Base Speed." },
    spd_2: { id: 'spd_2', label: 'Barrage', category: 'SPD', cost: 2, x: 120, y: 280, parent: 'spd_1', unlocked: false, equipped: false, desc: "Active: Flurry of punches that fully stuns the enemy. Can clash!" },
    spd_3: { id: 'spd_3', label: 'Wolf Rush', category: 'SPD', cost: 3, x: 120, y: 400, parent: 'spd_1', unlocked: false, equipped: false, desc: "Active: Two strikes, teleport behind, heavy knockback finisher." },
    
    // CON Branch
    con_1: { id: 'con_1', label: 'Iron Skin', category: 'CON', cost: 1, x: 290, y: 530, parent: 'root', unlocked: false, equipped: false, desc: "Passive: +20 Base Max HP." },
    con_2: { id: 'con_2', label: 'Kaioken x5', category: 'CON', cost: 3, x: 220, y: 660, parent: 'con_1', unlocked: false, equipped: false, desc: "Active: x2.5 Damage, lose 1 HP/sec. Lasts 15s. (Once per match)" },
    con_3: { id: 'con_3', label: 'Burst', category: 'CON', cost: 2, x: 360, y: 660, parent: 'con_1', unlocked: false, equipped: false, desc: "Active: Instantly deflects incoming ki projectiles & beams." },

    // KI Branch
    ki_beam: { id: 'ki_beam', label: 'Energy Beam', category: 'KI', cost: 2, x: 400, y: 220, parent: 'root', unlocked: false, equipped: false, desc: "Active: Fire a massive sustained beam (Cost: 50 Ki)." },
    ki_2: { id: 'ki_2', label: 'Grenade Barrage', category: 'KI', cost: 2, x: 400, y: 90, parent: 'ki_beam', unlocked: false, equipped: false, desc: "Active: Scatter explosive Ki mines (Cost: 40 Ki)." },
    ki_3: { id: 'ki_3', label: 'Ki Ball', category: 'KI', cost: 3, x: 300, y: 150, parent: 'ki_beam', unlocked: false, equipped: false, desc: "Active: Throws a massive exploding ball of raw energy (Cost: 60 Ki)." },
    ki_4: { id: 'ki_4', label: 'Ki Arrows', category: 'KI', cost: 2, x: 500, y: 150, parent: 'ki_beam', unlocked: false, equipped: false, desc: "Active: Fire 3 homing energy blasts (Cost: 30 Ki)." },

    // RACE Branch
    race_1: { id: 'race_1', label: 'Racial Pride', category: 'RACE', cost: 3, x: 510, y: 530, parent: 'root', unlocked: false, equipped: false, desc: "Passive: Enhances your racial stat multipliers by 20%." },
    race_all_1: { id: 'race_all_1', label: 'Power Boost', category: 'RACE', cost: 3, x: 630, y: 530, parent: 'race_1', unlocked: false, equipped: false, desc: "Active: Transforms with a white aura, x1.3 Damage/Speed for 20s." },
    race_2: { id: 'race_2', label: 'False Super Saiyan', category: 'RACE', cost: 4, x: 580, y: 660, parent: 'race_1', unlocked: false, equipped: false, desc: "Active (Saiyan Heritage): +Spd/Str for 20s. Take more dmg, block less." },
    race_3: { id: 'race_3', label: 'Super Saiyan', category: 'RACE', cost: 5, x: 660, y: 780, parent: 'race_2', unlocked: false, equipped: false, desc: "Active (Saiyan Heritage): Takes time to charge. Massive golden stats boost!" }
};

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

function renderSkillTree() {
    const nodesContainer = document.getElementById('tree-nodes');
    const svgLines = document.getElementById('tree-lines');
    
    nodesContainer.innerHTML = '';
    svgLines.innerHTML = '';

    document.getElementById('ui-ev-points').innerText = evolutionPoints;
    document.getElementById('ui-equipped-slots').innerText = `${getEquippedCount()} / ${MAX_EQUIPPED_SKILLS}`;

    Object.values(SKILL_TREE).forEach(node => {
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

        let el = document.createElement('div');
        let classStr = 'node';
        if (node.id === 'root') classStr += ' root';
        else if (node.equipped) classStr += ' equipped';
        else if (node.unlocked) classStr += ' unlocked';
        
        el.className = classStr;
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';
        el.innerText = node.category;

        let tooltip = document.createElement('div');
        tooltip.className = 'node-tooltip';
        tooltip.innerHTML = `<h4>${node.label}</h4><p>${node.desc}</p>`;
        
        if (node.id !== 'root') {
            if (!node.unlocked) tooltip.innerHTML += `<span>Cost: ${node.cost} EV</span>`;
            else if (node.equipped) tooltip.innerHTML += `<span style="color: #01FF70;">Equipped</span>`;
            else tooltip.innerHTML += `<span style="color: #7FDBFF;">Unlocked (Click to Equip)</span>`;
        }

        el.appendChild(tooltip);

        el.onmousedown = (e) => e.stopPropagation(); 
        el.onclick = () => handleNodeClick(node.id);
        
        nodesContainer.appendChild(el);
    });

    document.getElementById('tree-canvas').style.transform = `translate(${treePan.x}px, ${treePan.y}px)`;
}

function handleNodeClick(nodeId) {
    let node = SKILL_TREE[nodeId];
    if (node.id === 'root') return;

    if ((node.id === 'race_2' || node.id === 'race_3') && (!blueBrawler || (blueBrawler.raceName !== 'Saiyan' && blueBrawler.raceName !== 'Half-Saiyan'))) {
        logCombat('Unlock Failed: Exclusive to Saiyan Heritage!');
        return;
    }

    if (!node.unlocked) {
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
    
    if (blueBrawler) {
        blueBrawler.updateStats(getEquippedSkillIDs());
        updateProfileUI();
    }
}

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


const UPGRADES =[
    { name: "Sharpened Strikes", desc: "Increase base damage by 2.", apply: (p) => { p.baseDamage += 2; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Iron Will", desc: "Increase base Max HP by 20 and heal.", apply: (p) => { p.baseMaxHealth += 20; p.updateStats(getEquippedSkillIDs()); p.health += 20; } },
    { name: "Agility Training", desc: "Increase base Speed by 1.5.", apply: (p) => { p.baseMaxSpeed += 1.5; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Heavy Weight", desc: "Increase base Knockback by 10.", apply: (p) => { p.baseKnockback += 10; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Full Restore", desc: "Heal back to 100% HP.", apply: (p) => p.health = p.maxHealth },
    { name: "Vampirism", desc: "Heal 5 HP instantly.", apply: (p) => p.health = Math.min(p.maxHealth, p.health + 5) }
];

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
    
    upgradeModal.querySelector('h2').innerText = "Victory! Choose an Upgrade";
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

function showAbsorbSelect() {
    isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const upgradeModal = document.getElementById('upgrade-selection');
    const upgradeOptions = document.getElementById('upgrade-options');
    
    uiLayer.classList.remove('hidden');
    upgradeModal.classList.remove('hidden');
    document.getElementById('race-selection').classList.add('hidden');
    
    upgradeModal.querySelector('h2').innerText = "Absorb Enemy Trait!";
    upgradeOptions.innerHTML = '';
    
    let traits =[
        { name: "Absorb Power", desc: `Gain +${(enemyBrawler.damage * 0.1).toFixed(1)} Base Damage.`, apply: (p) => { p.baseDamage += enemyBrawler.damage * 0.1; p.updateStats(getEquippedSkillIDs()); } },
        { name: "Absorb Agility", desc: `Gain +${(enemyBrawler.maxSpeed * 0.05).toFixed(1)} Base Speed.`, apply: (p) => { p.baseMaxSpeed += enemyBrawler.maxSpeed * 0.05; p.updateStats(getEquippedSkillIDs()); } },
        { name: "Absorb Vitality", desc: `Gain +${(enemyBrawler.maxHealth * 0.15).toFixed(0)} Max HP & Heal.`, apply: (p) => { let inc = enemyBrawler.maxHealth * 0.15; p.baseMaxHealth += inc; p.updateStats(getEquippedSkillIDs()); p.health += inc; } }
    ];
    
    traits.forEach(trait => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${trait.name}</h3><p>${trait.desc}</p>`;
        
        btn.onclick = () => {
            trait.apply(blueBrawler);
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

function triggerWin(isAbsorb = false) {
    score++;
    let difficulty = 1 + Math.floor(score / 2);
    evolutionPoints += difficulty;
    renderSkillTree();
    logCombat(`Victory! Gained ${difficulty} EV Points!`);

    screenShake = 30;
    hitStopFrames = 15;
    isPlaying = false; 
    updateProfileUI();
    
    setTimeout(() => {
        if (isAbsorb) showAbsorbSelect();
        else showUpgradeSelect();
    }, 1500);
}

function startGame() {
    score = 0;
    particles =[];
    kiBlasts =[];
    homingBlasts =[];
    kiBalls =[];
    kiGrenades =[];
    beams =[];
    currentArena.generate();
    spawnPlayer();
    spawnEnemy();
    updateProfileUI();
    isPlaying = true;
    logCombat('Fight!');
}

function spawnPlayer() {
    let style = STYLES[Math.floor(Math.random() * STYLES.length)];
    blueBrawler = new Brawler(width / 4, height / 2, '#0074D9', true, style, playerSelectedRace);
    blueBrawler.updateStats(getEquippedSkillIDs());
}

function spawnEnemy() {
    currentArena.generate(); 
    
    let color = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
    let style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let allRaces = Object.keys(RACES);
    let randomRace = allRaces[Math.floor(Math.random() * allRaces.length)];

    let spawnX = blueBrawler.pos.x > width / 2 ? width / 4 : (width / 4) * 3;
    let spawnY = height / 4 + Math.random() * (height / 2);
    
    enemyBrawler = new Brawler(spawnX, spawnY, color, false, style, randomRace);
    
    let enemySkills =[];
    if (score >= 1 && Math.random() < 0.3) enemySkills.push('race_all_1'); // Power Boost
    if (score >= 2 && Math.random() < 0.3) enemySkills.push('ki_beam');
    if (score >= 2 && Math.random() < 0.3) enemySkills.push('ki_4'); // Ki Arrows
    if (score >= 3 && Math.random() < 0.3) enemySkills.push('str_3'); // Dragon Throw
    if (score >= 3 && Math.random() < 0.3) enemySkills.push('con_2'); // Kaioken
    if (score >= 4 && Math.random() < 0.3) enemySkills.push('spd_3'); // Wolf Rush
    if (score >= 4 && Math.random() < 0.3) enemySkills.push('ki_3'); // Ki Ball
    if (score >= 5 && (randomRace === 'Saiyan' || randomRace === 'Half-Saiyan') && Math.random() < 0.5) enemySkills.push('race_3'); // SSJ
    
    enemyBrawler.updateStats(enemySkills);

    if (randomRace === 'Bio-Android') {
        for(let i=0; i<3; i++) {
            let randomUpgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
            randomUpgrade.apply(enemyBrawler);
        }
    }

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

    if (defender.fssjTimer > 0) finalDmg *= 1.3; 

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
        }
    }

    return { damage: finalDmg, kb: kbVec, dodged: dodged, blocked: blocked, stunFrames: stunFrames, isComboFinisher: isFinisher };
}

function tryTeleportCounter(defender, attacker) {
    let tpChance = defender.fssjTimer > 0 ? 0.05 : 0.20; 
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

    if (blueBrawler.barrageTimer > 0 && enemyBrawler.barrageTimer > 0 && dist < 100) {
        let clashMid = Vector.add(blueBrawler.pos, enemyBrawler.pos).mult(0.5);
        spawnExplosion(clashMid.x, clashMid.y, '#FFFFFF', 4, 2);
        blueBrawler.vel.sub(blueBrawler.lookDir.copy().mult(1));
        enemyBrawler.vel.sub(enemyBrawler.lookDir.copy().mult(1));
        screenShake = Math.max(screenShake, 3);
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
    processBarrageHit(blueBrawler, enemyBrawler);
    processBarrageHit(enemyBrawler, blueBrawler);

    // Hard Locks
    let locksA = blueBrawler.chokeTimer > 0 || blueBrawler.isTransformingSSJ > 0 || blueBrawler.barrageTimer > 0 || blueBrawler.absorbTimer > 0 || blueBrawler.dragonThrowTimer > 0 || blueBrawler.wolfRushTimer > 0;
    let locksB = enemyBrawler.chokeTimer > 0 || enemyBrawler.isTransformingSSJ > 0 || enemyBrawler.barrageTimer > 0 || enemyBrawler.absorbTimer > 0 || enemyBrawler.dragonThrowTimer > 0 || enemyBrawler.wolfRushTimer > 0;
    
    if (locksA || locksB) {
        return;
    }

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

function getSegmentIntersection(p0, p1, p2, p3) {
    let s1_x = p1.x - p0.x;
    let s1_y = p1.y - p0.y;
    let s2_x = p3.x - p2.x;
    let s2_y = p3.y - p2.y;

    let denom = (-s2_x * s1_y + s1_x * s2_y);
    if (denom === 0) return null; 

    let s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denom;
    let t = ( s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denom;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return new Vector(p0.x + (t * s1_x), p0.y + (t * s1_y));
    }
    return null;
}

function checkObstacleCollisions() {
    let activeBrawlers = [blueBrawler, enemyBrawler].filter(b => !b.isDead);
    
    // Brawler against Obstacles
    activeBrawlers.forEach(b => {
        currentArena.obstacles.forEach(obs => {
            if (obs.isDead || obs.falling) return;
            
            let dist = Vector.dist(b.pos, obs.pos);
            let minDist = b.radius + obs.radius;
            
            if (dist < minDist) {
                let overlap = minDist - dist;
                let pushDir = Vector.sub(b.pos, obs.pos).normalize();

                // If Brawler hits it hard (knockback state)
                if (b.vel.mag() > 8) {
                    obs.takeDamage(b.vel.mag() * 1.5, b.vel);
                    
                    // Fixed: Only apply collision damage to brawler if they were stunned/thrown
                    // This guarantees they can't kill themselves by simply dashing into rocks!
                    if (b.stunTimer > 0) {
                        let envDamage = b.vel.mag() * 0.2;
                        // Cap health drop so the environment cannot deal the lethal blow directly
                        b.health = Math.max(1, b.health - envDamage);
                        logCombat(`${b.isPlayer ? 'Player' : 'Enemy'} crashed into a ${obs.type}!`);
                    }

                    spawnExplosion(b.pos.x, b.pos.y, '#AAAAAA', 5, 1);
                    screenShake = Math.max(screenShake, 5);
                    
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
    let allProjectiles =[...kiBlasts, ...homingBlasts, ...kiBalls, ...kiGrenades];
    
    allProjectiles.forEach(p => {
        if (!p.active && !(p instanceof KiGrenade && !p.detonating)) return;

        currentArena.obstacles.forEach(obs => {
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
                    screenShake = Math.max(screenShake, 10);
                } else if (p instanceof KiGrenade) {
                    p.detonating = true;
                    p.vel.mult(0);
                }
            }
        });
    });

    // Beams against obstacles
    beams.forEach(beam => {
        if (!beam.active) return;
        currentArena.obstacles.forEach(obs => {
            if (obs.isDead || obs.falling) return;
            let dummyTarget = { pos: obs.pos, radius: obs.radius };
            if (beam.checkCollision(dummyTarget)) {
                obs.takeDamage(2, beam.brawler.lookDir.copy().mult(5)); // Sustained damage
                spawnExplosion(obs.pos.x, obs.pos.y, beam.color, 1, 0.5);
            }
        });
    });
}

function updateGameLogic() {
    if (!isPlaying) return;

    if (hitStopFrames > 0) {
        hitStopFrames--;
        return; 
    }

    currentArena.update(); // Update scenery

    const activeBrawlers =[blueBrawler, enemyBrawler];
    const allProjectiles =[...kiBlasts, ...homingBlasts, ...kiBalls, ...kiGrenades, ...beams];

    activeBrawlers.forEach(b => {
        if (b.isDead) return;
        let opponent = b.isPlayer ? enemyBrawler : blueBrawler;

        // --- BURST AUTO-REFLEX SYSTEM ---
        if (b.hasBurst && b.burstCd <= 0 && b.ki >= 15) {
            let danger = false;
            beams.forEach(beam => {
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
            if (b.burstTimer === 15) screenShake = Math.max(screenShake, 10);
            
            allProjectiles.forEach(p => {
                if (!p.active) return;
                if (p instanceof EnergyBeam) {
                    let dummyTarget = { pos: b.pos, radius: 150 }; 
                    if (p.brawler !== b && p.checkCollision(dummyTarget)) {
                        p.active = false; 
                        spawnExplosion(b.pos.x, b.pos.y, p.color, 10, 2);
                    }
                } else {
                    let pPos = p.pos;
                    if (Vector.dist(b.pos, pPos) < 150 && p.brawler !== b) {
                        p.vel.mult(-1.5); 
                        p.brawler = b; 
                        p.isPlayer = b.isPlayer;
                        p.color = b.color;
                    }
                }
            });
            if (Vector.dist(b.pos, opponent.pos) < 150) {
                let push = Vector.sub(opponent.pos, b.pos).normalize().mult(b.burstTimer === 15 ? 20 : 2);
                opponent.vel.add(push);
                opponent.stunTimer = Math.max(opponent.stunTimer, 20);
            }
        }

        // --- STR: CHOKE ---
        if (b.chokeTimer > 0 && b.chokedTarget) {
            let target = b.chokedTarget;
            let holdPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + target.radius));
            target.pos.x += (holdPos.x - target.pos.x) * 0.5;
            target.pos.y += (holdPos.y - target.pos.y) * 0.5;
            target.vel.mult(0);
            
            if (b.chokeTimer % 10 === 0 && b.chokeTimer > 5) {
                target.health -= (b.getEffectiveDamage() * 0.5); 
                spawnExplosion(target.pos.x, target.pos.y, '#AAAAAA', 2, 1);
                screenShake = Math.max(screenShake, 3);
            }
            if (b.chokeTimer === 1) {
                target.health -= (b.getEffectiveDamage() * 2);
                target.stunTimer = 60;
                target.vel = b.lookDir.copy().mult(25); 
                spawnExplosion(target.pos.x, target.pos.y, b.color, 20, 3);
                screenShake = Math.max(screenShake, 15);
                b.chokedTarget = null;
            }
        }

        // --- STR: DRAGON THROW ---
        if (b.dragonThrowTimer > 0 && b.dragonThrowTarget) {
            let target = b.dragonThrowTarget;
            
            b.lookDir.rotate(0.35); // Fast spin
            let holdPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + target.radius + 10));
            target.pos.x = holdPos.x;
            target.pos.y = holdPos.y;
            target.vel.mult(0);

            if (b.dragonThrowTimer === 40 || b.dragonThrowTimer === 20) {
                target.health -= b.getEffectiveDamage();
                spawnExplosion(target.pos.x, target.pos.y, b.color, 5, 1);
                screenShake = Math.max(screenShake, 5);
            }
            if (b.dragonThrowTimer === 1) {
                target.health -= (b.getEffectiveDamage() * 2);
                target.stunTimer = 90;
                target.vel = b.lookDir.copy().mult(30); // Massive throw distance
                spawnExplosion(target.pos.x, target.pos.y, b.color, 25, 4);
                screenShake = Math.max(screenShake, 20);
                b.dragonThrowTarget = null;
            }
        }

        // --- SPD: WOLF RUSH ---
        if (b.wolfRushTimer > 0 && b.wolfRushTarget) {
            let target = b.wolfRushTarget;
            target.vel.mult(0); // Lock target
            target.stunTimer = 10;
            
            if (b.wolfRushTimer === 60 || b.wolfRushTimer === 40) {
                target.health -= (b.getEffectiveDamage() * 0.8);
                spawnExplosion(target.pos.x, target.pos.y, b.color, 8, 2);
                screenShake = Math.max(screenShake, 6);
                b.lookDir = Vector.sub(target.pos, b.pos).normalize();
            }
            
            if (b.wolfRushTimer === 30) {
                // TP Behind
                let toB = Vector.sub(b.pos, target.pos).normalize();
                let tpTarget = Vector.add(target.pos, toB.mult(-40)); // Backside
                b.triggerTeleport(tpTarget);
                b.lookDir = Vector.sub(target.pos, b.pos).normalize();
            }

            if (b.wolfRushTimer === 10) {
                // Finisher
                target.health -= (b.getEffectiveDamage() * 2.5);
                target.stunTimer = 60;
                target.vel = b.lookDir.copy().mult(35);
                spawnExplosion(target.pos.x, target.pos.y, '#FFFFFF', 30, 4);
                screenShake = Math.max(screenShake, 25);
                hitStopFrames = 10;
                b.wolfRushTarget = null;
            }
        }

        // --- SKILL: SUPER SAIYAN (SSJ) ---
        if (b.wantsToSSJ) {
            b.wantsToSSJ = false;
            b.usedSSJ = true;
            b.ki = 0; 
            b.isTransformingSSJ = 90; 
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} is transforming...`);
        }

        if (b.isTransformingSSJ > 0) {
            spawnExplosion(b.pos.x, b.pos.y, '#FFFFFF', 1, 3); 
            let toOpp = Vector.sub(opponent.pos, b.pos);
            if (toOpp.mag() < 300) {
                opponent.vel.add(toOpp.normalize().mult(1.5)); 
            }
            if (b.isTransformingSSJ === 1) {
                b.ssjTimer = 1800; // 30 seconds
                spawnExplosion(b.pos.x, b.pos.y, '#FFDC00', 50, 4);
                screenShake = Math.max(screenShake, 20);
                logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} SUPER SAIYAN!`);
            }
        }

        // --- ACTIVE BUFFS ---
        if (b.wantsToPowerBoost) {
            b.wantsToPowerBoost = false;
            b.usedPowerBoost = true;
            b.powerBoostTimer = 1200; 
            spawnExplosion(b.pos.x, b.pos.y, '#FFFFFF', 30, 2);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} activated POWER BOOST!`);
            screenShake = Math.max(screenShake, 10);
        }
        if (b.wantsToFSSJ) {
            b.wantsToFSSJ = false;
            b.usedFSSJ = true;
            b.fssjTimer = 1200; 
            spawnExplosion(b.pos.x, b.pos.y, '#FF8C00', 30, 2);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} triggered FALSE SUPER SAIYAN!`);
            screenShake = Math.max(screenShake, 10);
        }
        if (b.wantsToKaioken) {
            b.wantsToKaioken = false;
            b.usedKaioken = true;
            b.kaiokenTimer = 900; 
            spawnExplosion(b.pos.x, b.pos.y, '#FF0000', 20, 2);
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} activated KAIOKEN x5!`);
            screenShake = Math.max(screenShake, 8);
        }

        // --- PROJECTILE SPAWNS ---
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
        }

        if (b.wantsToGrenade) {
            b.wantsToGrenade = false;
            let toOpp = Vector.sub(opponent.pos, b.pos).normalize();
            for(let i=0; i<12; i++) { 
                let spawnPos = Vector.add(b.pos, toOpp.copy().mult(b.radius + 15));
                kiGrenades.push(new KiGrenade(spawnPos.x, spawnPos.y, toOpp, b.color, b.isPlayer));
            }
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} scattered a Grenade Barrage!`);
        }

        if (b.wantsToKiArrows) {
            b.wantsToKiArrows = false;
            let toOpp = Vector.sub(opponent.pos, b.pos).normalize();
            for(let i=-1; i<=1; i++) { 
                let spawnPos = Vector.add(b.pos, toOpp.copy().mult(b.radius + 15));
                let dir = toOpp.copy().rotate(i * 0.5);
                homingBlasts.push(new HomingKiBlast(spawnPos.x, spawnPos.y, dir, b.color, b.isPlayer, opponent));
            }
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} fired Ki Arrows!`);
        }

        if (b.wantsToKiBall) {
            b.wantsToKiBall = false;
            let spawnPos = Vector.add(b.pos, b.lookDir.copy().mult(b.radius + 20));
            kiBalls.push(new KiBall(spawnPos.x, spawnPos.y, b.lookDir, b.color, b.isPlayer));
            logCombat(`${b.isPlayer ? 'P1' : 'Enemy'} threw a massive Ki Ball!`);
        }

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

    // Handle Projectile logic + Environment collisions
    checkObstacleCollisions();

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
            if (target.burstTimer > 0 || target.isDead) continue; 

            if (target.isBlocking > 0) {
                target.vel.add(blast.vel.copy().normalize().mult(1.5)); 
            } else if (target.isDodging > 0) {
            } else if (target.invulnTimer <= 0) {
                target.health -= 0.5;
                target.vel.add(blast.vel.copy().normalize().mult(3));
                target.stunTimer = Math.max(target.stunTimer, 15);
                target.invulnTimer = 10;
                spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 15, 1);
            }
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            kiBlasts.splice(i, 1);
        }
    }

    // Update Homing Blasts
    for (let i = homingBlasts.length - 1; i >= 0; i--) {
        let blast = homingBlasts[i];
        blast.update();

        if (blast.pos.x < 0 || blast.pos.x > width || blast.pos.y < 0 || blast.pos.y > height || blast.life <= 0) {
            spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 5, 0.5);
            homingBlasts.splice(i, 1);
            continue;
        }

        let target = blast.isPlayer ? enemyBrawler : blueBrawler;
        if (Vector.dist(blast.pos, target.pos) < target.radius + blast.radius) {
            if (target.burstTimer > 0 || target.isDead) continue; 
            if (target.isBlocking > 0) {
                target.vel.add(blast.vel.copy().normalize().mult(1.0)); 
            } else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                target.health -= 0.8;
                target.vel.add(blast.vel.copy().normalize().mult(2));
                target.stunTimer = Math.max(target.stunTimer, 10);
                spawnExplosion(blast.pos.x, blast.pos.y, blast.color, 10, 1);
            }
            homingBlasts.splice(i, 1);
        }
    }

    // Update Ki Balls
    for (let i = kiBalls.length - 1; i >= 0; i--) {
        let ball = kiBalls[i];
        ball.update();

        if (ball.pos.x < 0 || ball.pos.x > width || ball.pos.y < 0 || ball.pos.y > height || ball.life <= 0) {
            spawnExplosion(ball.pos.x, ball.pos.y, ball.color, 20, 2.0);
            kiBalls.splice(i, 1);
            continue;
        }

        let target = ball.isPlayer ? enemyBrawler : blueBrawler;
        if (Vector.dist(ball.pos, target.pos) < target.radius + ball.radius) {
            if (target.burstTimer > 0 || target.isDead) continue; 
            if (target.isBlocking > 0) {
                target.health -= 2.0; // Heavy chip
                target.vel.add(ball.vel.copy().normalize().mult(5)); 
            } else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                target.health -= 6.0;
                target.vel.add(ball.vel.copy().normalize().mult(15));
                target.stunTimer = Math.max(target.stunTimer, 40);
            }
            spawnExplosion(ball.pos.x, ball.pos.y, ball.color, 50, 4);
            screenShake = Math.max(screenShake, 15);
            kiBalls.splice(i, 1);
        }
    }

    // Update Grenades
    for (let i = kiGrenades.length - 1; i >= 0; i--) {
        let g = kiGrenades[i];
        g.update();

        if (g.detonating) {
            let target = g.isPlayer ? enemyBrawler : blueBrawler;
            if (g.detonateTimer === 1 && !target.isDead) { 
                if (Vector.dist(g.pos, target.pos) < g.radius + target.radius + 20) {
                    if (target.burstTimer <= 0) {
                        if (target.isBlocking > 0) {
                            target.health -= 1.0;
                        } else if (target.isDodging <= 0 && target.invulnTimer <= 0) {
                            target.health -= 3.0; 
                            target.vel.add(Vector.sub(target.pos, g.pos).normalize().mult(10));
                            target.stunTimer = Math.max(target.stunTimer, 20);
                        }
                    }
                    screenShake = Math.max(screenShake, 5);
                }
            }
            if (!g.active) kiGrenades.splice(i, 1);
            continue;
        }

        if (g.pos.x < 0 || g.pos.x > width || g.pos.y < 0 || g.pos.y > height) {
            g.detonating = true;
            continue;
        }

        let target = g.isPlayer ? enemyBrawler : blueBrawler;
        if (!target.isDead && Vector.dist(g.pos, target.pos) < target.radius + 60) {
            g.detonating = true;
            g.vel.mult(0); 
        }
    }

    // Update Energy Beams
    for (let i = beams.length - 1; i >= 0; i--) {
        let beam = beams[i];
        beam.update();
        if (!beam.active) beams.splice(i, 1);
    }

    beams.forEach(b => b.clashPoint = null);

    for (let i = 0; i < beams.length; i++) {
        for (let j = i + 1; j < beams.length; j++) {
            let b1 = beams[i];
            let b2 = beams[j];

            if (b1.brawler !== b2.brawler) {
                let p0 = b1.getStartPos();
                let p1 = b1.getRawEndPos();
                let p2 = b2.getStartPos();
                let p3 = b2.getRawEndPos();

                let intersect = getSegmentIntersection(p0, p1, p2, p3);

                if (!intersect && Vector.dist(p0, p2) < b1.currentLength + b2.currentLength) {
                    if (b1.brawler.lookDir.dot(b2.brawler.lookDir) < -0.5) {
                        let ratio = b1.currentLength / (b1.currentLength + b2.currentLength);
                        intersect = Vector.add(p0, Vector.sub(p2, p0).mult(ratio));
                    }
                }

                if (intersect) {
                    b1.clashPoint = intersect;
                    b2.clashPoint = intersect;
                    
                    spawnExplosion(intersect.x, intersect.y, '#FFFFFF', 3, 2);
                    spawnExplosion(intersect.x, intersect.y, b1.color, 2, 3);
                    spawnExplosion(intersect.x, intersect.y, b2.color, 2, 3);
                    screenShake = Math.max(screenShake, 5);
                }
            }
        }
    }

    for (let i = 0; i < beams.length; i++) {
        let beam = beams[i];
        let target = beam.brawler.isPlayer ? enemyBrawler : blueBrawler;
        
        if (!target.isDead && target.burstTimer <= 0 && beam.checkCollision(target)) {
            if (target.isBlocking > 0) {
                target.health -= 0.5; 
                target.vel.add(beam.brawler.lookDir.copy().mult(1));
            } else if (target.isDodging > 0) {
                // Phased
            } else if (target.invulnTimer <= 0) {
                target.health -= 2.0; 
                target.vel.add(beam.brawler.lookDir.copy().mult(3));
                target.stunTimer = Math.max(target.stunTimer, 10);
                
                spawnExplosion(target.pos.x, target.pos.y, beam.color, 10, 1.5);
                screenShake = Math.max(screenShake, 5);
            }
        }
    }

    // Process movements and core combat AI
    if (!blueBrawler.isDead) blueBrawler.applyForce(blueBrawler.getSteering(enemyBrawler, width, height, allProjectiles, currentArena.obstacles));
    if (!enemyBrawler.isDead) enemyBrawler.applyForce(enemyBrawler.getSteering(blueBrawler, width, height, allProjectiles, currentArena.obstacles));
    else enemyBrawler.vel.mult(0.8);

    if (!blueBrawler.isDead && !enemyBrawler.isDead) {
        handleCombat();
    }

    blueBrawler.update(width, height);
    enemyBrawler.update(width, height);
    
    updateProfileUI();

    // Kill Death Logic & Bio-Android Absorb State Transition
    if (enemyBrawler.health <= 0 && !enemyBrawler.isDead) {
        enemyBrawler.isDead = true; 
        enemyBrawler.stunTimer = 9999;
        enemyBrawler.attackLockout = 9999;
        enemyBrawler.wantsToShoot = false;
        enemyBrawler.wantsToBeam = false;
        enemyBrawler.wantsToFSSJ = false;
        enemyBrawler.wantsToSSJ = false;
        enemyBrawler.wantsToKaioken = false;
        enemyBrawler.wantsToGrenade = false;

        if (blueBrawler.raceName === 'Bio-Android') {
            blueBrawler.absorbTarget = enemyBrawler;
            blueBrawler.absorbTimer = 60;
            logCombat(`Absorbing ${enemyBrawler.raceName}...`);
        } else {
            spawnExplosion(enemyBrawler.pos.x, enemyBrawler.pos.y, enemyBrawler.color, 80, 4.0);
            triggerWin(false);
        }
    }

    if (enemyBrawler.isDead) {
        enemyBrawler.vel.mult(0.5); 
        if (blueBrawler.absorbTimer > 0) {
            // Wait for animation
        } else if (blueBrawler.absorbTarget) {
            blueBrawler.absorbTarget = null;
            spawnExplosion(enemyBrawler.pos.x, enemyBrawler.pos.y, blueBrawler.color, 50, 3);
            triggerWin(true);
        }
    }

    if (blueBrawler.health <= 0 && !blueBrawler.isDead) {
        blueBrawler.isDead = true;
        spawnExplosion(blueBrawler.pos.x, blueBrawler.pos.y, blueBrawler.color, 80, 4.0);
        screenShake = 35;
        hitStopFrames = 15;
        isPlaying = false;
        updateProfileUI();
        logCombat('You were defeated! Skill tree reset.');
        
        resetSkillTree(); 
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
    
    // Draw the new dynamic Arena!
    currentArena.draw(ctx);
    
    if (blueBrawler && enemyBrawler) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${score}`, width / 2, height / 2 + 30);
    }
    
    // Dead Bio-Android prey shrinks and is drawn until fully absorbed
    if (enemyBrawler && enemyBrawler.health > 0 || (enemyBrawler && enemyBrawler.isDead && blueBrawler.absorbTarget === enemyBrawler)) {
        enemyBrawler.draw(ctx);
    }

    if (blueBrawler && blueBrawler.health > 0) blueBrawler.draw(ctx);

    kiBlasts.forEach(b => b.draw(ctx));
    homingBlasts.forEach(b => b.draw(ctx));
    kiBalls.forEach(b => b.draw(ctx));
    kiGrenades.forEach(g => g.draw(ctx));
    beams.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

renderSkillTree();
showRaceSelect();
requestAnimationFrame(gameLoop);
import { state } from './state.js';
import { UPGRADES } from './upgrades.js';
import { getEquippedSkillIDs, renderSkillTree, resetSkillTree } from './skills.js';
import { getRandomRaces } from './races.js';
import { spawnExplosion } from './vfx.js';
import { enterHub, spawnEnemy, startZenkaiBattle, triggerWin } from './main.js';

export function logCombat(msg) {
    const log = document.getElementById('combat-log');
    if(log) log.innerHTML = `<p>${msg}</p>`;
}

export function updateProfileUI() {
    if (!state.blueBrawler) return;
    
    document.getElementById('ui-race').innerText = state.blueBrawler.raceName;
    document.getElementById('ui-style').innerText = state.blueBrawler.style;
    document.getElementById('ui-pl').innerText = state.blueBrawler.getPowerLevel().toLocaleString(); // Added Power Level
    
    // Update Alignment Details
    let alignPercent = 50 + (state.playerAlignment / 2); // -100 -> 0%, +100 -> 100%
    document.getElementById('ui-alignment-marker').style.left = `${alignPercent}%`;
    
    let alignLabel = 'Neutral';
    if (state.playerAlignment <= -80) alignLabel = 'Pure Evil';
    else if (state.playerAlignment <= -30) alignLabel = 'Villain';
    else if (state.playerAlignment < 30) alignLabel = 'Neutral';
    else if (state.playerAlignment < 80) alignLabel = 'Hero';
    else alignLabel = 'Savior';
    document.getElementById('ui-alignment-label').innerText = alignLabel;
    
    let hpStr = `${Math.ceil(Math.max(0, state.blueBrawler.health))} / ${Math.ceil(state.blueBrawler.maxHealth)}`;
    document.getElementById('ui-hp').innerText = hpStr;
    document.getElementById('ui-hp-fill').style.width = `${Math.max(0, state.blueBrawler.health / state.blueBrawler.maxHealth) * 100}%`;

    let kiStr = `${Math.floor(state.blueBrawler.ki)} / ${state.blueBrawler.maxKi}`;
    document.getElementById('ui-ki').innerText = kiStr;
    document.getElementById('ui-ki-fill').style.width = `${Math.max(0, state.blueBrawler.ki / state.blueBrawler.maxKi) * 100}%`;

    document.getElementById('ui-dmg').innerText = state.blueBrawler.getEffectiveDamage().toFixed(1);
    document.getElementById('ui-spd').innerText = state.blueBrawler.getEffectiveSpeed().toFixed(1);
    document.getElementById('ui-kb').innerText = state.blueBrawler.knockback.toFixed(1);

    let blockSecs = Math.max(0, (state.blueBrawler.blockCooldown / 60)).toFixed(1);
    document.getElementById('ui-block').innerText = blockSecs > 0 ? `${blockSecs}s` : "READY";

    // Senzu Beans Update
    document.getElementById('ui-senzu-count').innerText = state.senzuBeans;
}

export function showRaceSelect() {
    state.isPlaying = false;
    state.currentMode = 'MENU';
    state.senzuBeans = 3; 
    state.score = 0;
    
    // Reset Meta States
    state.playerAlignment = 0; 
    state.savedContacts =[];
    state.pendingChats = [];
    state.revengeQueue =[];
    state.activeChatEnemy = null;
    renderContacts();
    
    state.blueBrawler = null; 
    
    const uiLayer = document.getElementById('ui-layer');
    const raceModal = document.getElementById('race-selection');
    const raceOptions = document.getElementById('race-options');
    
    uiLayer.classList.remove('hidden');
    raceModal.classList.remove('hidden');
    document.getElementById('upgrade-selection').classList.add('hidden');
    document.getElementById('zenkai-prompt').classList.add('hidden');
    document.getElementById('fate-selection').classList.add('hidden');
    document.getElementById('hub-ui').classList.add('hidden');
    
    raceOptions.innerHTML = '';
    logCombat('Select your fighter.');
    
    let choices = getRandomRaces(3);
    choices.forEach(race => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${race.name}</h3><p>${race.desc}</p>`;
        
        btn.onclick = () => {
            state.playerSelectedRace = race.name;
            uiLayer.classList.add('hidden');
            raceModal.classList.add('hidden');
            enterHub(); // Go to Hub instead of straight to battle
        };
        raceOptions.appendChild(btn);
    });
}

export function calculateWinChance(player, enemy) {
    // Utilize the new getPowerLevel logic!
    let pPower = player.getPowerLevel();
    let ePower = enemy.getPowerLevel();
    
    pPower *= (1 + (state.senzuBeans * 0.2)); 
    
    let ratio = pPower / (pPower + ePower);
    let percent = Math.floor(ratio * 100);
    
    let variance = Math.floor(Math.random() * 7) - 3; 
    return Math.max(1, Math.min(99, percent + variance)); 
}

export function promptZenkaiBattle() {
    spawnEnemy(); // Generates the enemy data in the background

    state.isPlaying = false;
    state.currentMode = 'MENU';
    
    const uiLayer = document.getElementById('ui-layer');
    const promptModal = document.getElementById('zenkai-prompt');
    const infoBox = document.getElementById('zenkai-enemy-info');
    const title = document.getElementById('zenkai-title');
    
    uiLayer.classList.remove('hidden');
    promptModal.classList.remove('hidden');
    document.getElementById('hub-ui').classList.add('hidden');
    
    if (state.enemyBrawler.isRevenge) {
        title.innerText = "VENGEANCE: Enemy Returned!";
        title.style.color = "#B10DC9";
    } else {
        title.innerText = "Warning: New Challenger!";
        title.style.color = "#FF4136";
    }
    
    let winChance = calculateWinChance(state.blueBrawler, state.enemyBrawler);
    
    let hideHP = !state.enemyBrawler.isRevenge && state.score >= 2 && Math.random() > 0.5;
    let hideDmg = !state.enemyBrawler.isRevenge && state.score >= 4 && Math.random() > 0.4;
    
    // Replaced Base Dmg explicitly with our shiny new Power Level readout
    infoBox.innerHTML = `
        <p>Race: <span>${state.enemyBrawler.raceName}</span></p>
        <p>Style: <span>${state.enemyBrawler.style}</span></p>
        <p>Power Level: <span>${state.enemyBrawler.getPowerLevel().toLocaleString()}</span></p>
        <p>Est. HP: <span>${hideHP ? '???' : Math.floor(state.enemyBrawler.maxHealth)}</span></p>
        <p>Est. Dmg: <span>${hideDmg ? '???' : state.enemyBrawler.baseDamage.toFixed(1)}</span></p>
        <div class="win-chance" style="color: ${winChance >= 50 ? '#2ECC40' : '#FF4136'}">
            Win Probability: ${winChance}%
        </div>
    `;
    
    logCombat(state.enemyBrawler.isRevenge ? 'A familiar foe seeks revenge...' : 'A challenger approaches...');
}

export function showFateSelection() {
    // Revenge targets don't get a second chance
    if (state.enemyBrawler.isRevenge) {
        spawnExplosion(state.enemyBrawler.pos.x, state.enemyBrawler.pos.y, state.enemyBrawler.color, 80, 4.0);
        triggerWin(false);
        return;
    }

    state.isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const fateModal = document.getElementById('fate-selection');
    
    uiLayer.classList.remove('hidden');
    fateModal.classList.remove('hidden');
    
    document.getElementById('race-selection').classList.add('hidden');
    document.getElementById('zenkai-prompt').classList.add('hidden');
    document.getElementById('upgrade-selection').classList.add('hidden');
    
    let color = state.enemyBrawler.moralAlignment === 'Hero' ? '#01FF70' : '#FF4136';
    document.getElementById('fate-enemy-info').innerHTML = `This combatant is a <span style="color: ${color}; font-weight: bold;">${state.enemyBrawler.moralAlignment}</span>.`;
    logCombat('Choose their fate...');
}

export function handleFate(decision) {
    document.getElementById('fate-selection').classList.add('hidden');
    
    if (decision === 'spare') {
        logCombat(`You spared the ${state.enemyBrawler.moralAlignment}.`);
        
        state.pendingChats.push({
            race: state.enemyBrawler.raceName,
            style: state.enemyBrawler.style,
            alignment: state.enemyBrawler.moralAlignment,
            color: state.enemyBrawler.color
        });
        
        state.playerAlignment += 5; 

        spawnExplosion(state.enemyBrawler.pos.x, state.enemyBrawler.pos.y, '#FFFFFF', 20, 1.0);
        triggerWin(false); 
        
    } else if (decision === 'kill') {
        logCombat(`You executed the ${state.enemyBrawler.moralAlignment}.`);
        
        if (state.enemyBrawler.moralAlignment === 'Hero') {
            state.playerAlignment -= 20; 
        } else {
            state.playerAlignment += 20; 
        }
        
        if (state.blueBrawler.raceName === 'Bio-Android') {
            state.blueBrawler.absorbTarget = state.enemyBrawler;
            state.blueBrawler.absorbTimer = 60;
            logCombat(`Absorbing ${state.enemyBrawler.raceName}...`);
            document.getElementById('ui-layer').classList.add('hidden');
            state.isPlaying = true; 
        } else {
            spawnExplosion(state.enemyBrawler.pos.x, state.enemyBrawler.pos.y, state.enemyBrawler.color, 80, 4.0);
            triggerWin(false);
        }
    }
    
    state.playerAlignment = Math.max(-100, Math.min(100, state.playerAlignment));
    updateProfileUI();
}

export function showUpgradeSelect(isSenzuRevive = false) {
    state.isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const upgradeModal = document.getElementById('upgrade-selection');
    const upgradeOptions = document.getElementById('upgrade-options');
    
    uiLayer.classList.remove('hidden');
    upgradeModal.classList.remove('hidden');
    document.getElementById('race-selection').classList.add('hidden');
    document.getElementById('zenkai-prompt').classList.add('hidden');
    document.getElementById('fate-selection').classList.add('hidden');
    
    upgradeModal.querySelector('h2').innerText = isSenzuRevive ? "Senzu Bean! Pick an Upgrade" : "Victory! Choose an Upgrade";
    upgradeOptions.innerHTML = '';
    
    let availableUpgrades = isSenzuRevive 
        ? UPGRADES.filter(u => u.name !== 'Full Restore' && u.name !== 'Vampirism') 
        : [...UPGRADES];

    let shuffled = availableUpgrades.sort(() => 0.5 - Math.random());
    let choices = shuffled.slice(0, 3);
    
    choices.forEach(upgrade => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${upgrade.name}</h3><p>${upgrade.desc}</p>`;
        
        btn.onclick = () => {
            upgrade.apply(state.blueBrawler);
            
            uiLayer.classList.add('hidden');
            upgradeModal.classList.add('hidden');
            
            if (isSenzuRevive) {
                state.blueBrawler.fullRestore(); 
                logCombat('Revived and ready to fight!');
                spawnEnemy();
                startZenkaiBattle(); 
            } else {
                logCombat('Returning to Hub...');
                enterHub();
            }
            updateProfileUI();
        };
        upgradeOptions.appendChild(btn);
    });
}

export function showAbsorbSelect() {
    state.isPlaying = false;
    const uiLayer = document.getElementById('ui-layer');
    const upgradeModal = document.getElementById('upgrade-selection');
    const upgradeOptions = document.getElementById('upgrade-options');
    
    uiLayer.classList.remove('hidden');
    upgradeModal.classList.remove('hidden');
    
    upgradeModal.querySelector('h2').innerText = "Absorb Enemy Trait!";
    upgradeOptions.innerHTML = '';
    
    let traits =[
        { name: "Absorb Power", desc: `Gain +${(state.enemyBrawler.damage * 0.05).toFixed(1)} Base Damage.`, apply: (p) => { p.baseDamage += state.enemyBrawler.damage * 0.05; p.updateStats(getEquippedSkillIDs()); } },
        { name: "Absorb Agility", desc: `Gain +${(state.enemyBrawler.maxSpeed * 0.02).toFixed(1)} Base Speed.`, apply: (p) => { p.baseMaxSpeed += state.enemyBrawler.maxSpeed * 0.02; p.updateStats(getEquippedSkillIDs()); } },
        { name: "Absorb Vitality", desc: `Gain +${(state.enemyBrawler.maxHealth * 0.08).toFixed(0)} Max HP & Heal.`, apply: (p) => { let inc = state.enemyBrawler.maxHealth * 0.08; p.baseMaxHealth += inc; p.updateStats(getEquippedSkillIDs()); p.health += inc; } }
    ];
    
    traits.forEach(trait => {
        let btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<h3>${trait.name}</h3><p>${trait.desc}</p>`;
        
        btn.onclick = () => {
            trait.apply(state.blueBrawler);
            updateProfileUI();
            
            uiLayer.classList.add('hidden');
            upgradeModal.classList.add('hidden');
            
            logCombat('Returning to Hub...');
            enterHub();
        };
        upgradeOptions.appendChild(btn);
    });
}

export function openActiveChat() {
    document.getElementById('contacts-view').classList.add('hidden');
    document.getElementById('chat-view').classList.remove('hidden');
    
    const history = document.getElementById('chat-history');
    const options = document.getElementById('chat-options');
    
    history.innerHTML = `<div class="chat-bubble enemy">Why did you spare me? I am a ${state.activeChatEnemy.alignment}!</div>`;
    options.innerHTML = '';
    
    let choices =[
        { text: "Because there's always a chance to change.", type: "good" },
        { text: "You weren't worth my time.", type: "neutral" },
        { text: "So I can beat you up again later.", type: "bad" }
    ];
    
    choices.forEach(c => {
        let btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.innerText = c.text;
        btn.onclick = () => handleChatChoice(c);
        options.appendChild(btn);
    });
}

export function handleChatChoice(choice) {
    const history = document.getElementById('chat-history');
    const options = document.getElementById('chat-options');
    
    history.innerHTML += `<div class="chat-bubble player">${choice.text}</div>`;
    options.innerHTML = ''; 
    
    setTimeout(() => {
        let response = '';
        if (choice.type === 'good') {
            if (Math.random() > 0.3) {
                response = "Maybe you're right... I owe you one.";
                state.savedContacts.push(state.activeChatEnemy);
                renderContacts();
            } else {
                response = "Hmph. Don't expect me to go easy next time.";
                state.revengeQueue.push(state.activeChatEnemy);
            }
        } else if (choice.type === 'neutral') {
            response = "I'll remember this insult. Goodbye.";
        } else {
            response = "You'll regret keeping me alive!!";
            state.revengeQueue.push(state.activeChatEnemy);
        }
        
        history.innerHTML += `<div class="chat-bubble enemy">${response}</div>`;
        
        setTimeout(() => {
            state.activeChatEnemy = null;
            document.getElementById('chat-view').classList.add('hidden');
            document.getElementById('contacts-view').classList.remove('hidden');
        }, 3000);
        
    }, 1200);
}

export function renderContacts() {
    const list = document.getElementById('contacts-list');
    if (state.savedContacts.length === 0) {
        list.innerHTML = '<p class="empty-text">No contacts yet.</p>';
        return;
    }
    
    list.innerHTML = '';
    state.savedContacts.forEach(c => {
        list.innerHTML += `
            <div class="contact-item">
                <div class="contact-color" style="background: ${c.color};"></div>
                <div class="contact-info">
                    <h4>${c.race}</h4>
                    <p>${c.style} (${c.alignment})</p>
                </div>
            </div>
        `;
    });
}

export function initUIEvents() {
    document.getElementById('btn-zenkai-battle').addEventListener('click', promptZenkaiBattle);
    document.getElementById('btn-accept-zenkai').addEventListener('click', startZenkaiBattle);
    document.getElementById('btn-decline-zenkai').addEventListener('click', () => {
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('zenkai-prompt').classList.add('hidden');
        state.enemyBrawler = null;
        enterHub(); 
    });
    
    document.getElementById('btn-spare').addEventListener('click', () => handleFate('spare'));
    document.getElementById('btn-kill').addEventListener('click', () => handleFate('kill'));

    document.getElementById('contact-module').addEventListener('mouseenter', () => {
        if (state.pendingChats.length > 0 && !state.activeChatEnemy) {
            document.getElementById('phone-notif').classList.add('hidden');
            document.getElementById('contact-module').classList.remove('has-notification');
            state.activeChatEnemy = state.pendingChats.shift();
            openActiveChat();
        }
    });
}
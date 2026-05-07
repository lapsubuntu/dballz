

export const ENEMY_COLORS =['#FF4136', '#2ECC40', '#FF851B', '#B10DC9', '#FFDC00', '#F012BE'];
export const STYLES = ['Quick Fist', 'Pummel', 'High Kicks'];
export const MAX_EQUIPPED_SKILLS = 3;

export const SKILL_TREE = {
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
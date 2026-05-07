

import { getEquippedSkillIDs } from './skills.js';

export const UPGRADES =[
    { name: "Sharpened Strikes", desc: "Increase base damage by 1.0.", apply: (p) => { p.baseDamage += 1.0; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Iron Will", desc: "Increase base Max HP by 10 and heal.", apply: (p) => { p.baseMaxHealth += 10; p.updateStats(getEquippedSkillIDs()); p.health += 10; } },
    { name: "Agility Training", desc: "Increase base Speed by 0.5.", apply: (p) => { p.baseMaxSpeed += 0.5; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Heavy Weight", desc: "Increase base Knockback by 5.", apply: (p) => { p.baseKnockback += 5; p.updateStats(getEquippedSkillIDs()); } },
    { name: "Full Restore", desc: "Heal back to 100% HP.", apply: (p) => p.health = p.maxHealth },
    { name: "Vampirism", desc: "Heal 5 HP instantly.", apply: (p) => p.health = Math.min(p.maxHealth, p.health + 5) }
];
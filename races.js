import { Vector } from './vector.js';

export const RACES = {
    'Human': {
        name: 'Human',
        desc: 'Adaptation: Taking the same style strike twice in a row reduces its damage by 50%.',
        hpMult: 1.0, spdMult: 1.0, dmgMult: 1.0, kbMult: 1.0
    },
    'Saiyan': {
        name: 'Saiyan',
        desc: 'Zenkai Boost: Damage increases up to +100% the lower your HP falls.',
        hpMult: 1.0, spdMult: 1.2, dmgMult: 1.2, kbMult: 1.2
    },
    'Half-Saiyan': {
        name: 'Half-Saiyan',
        desc: 'Potential: Has Human adaptability to strikes, but can unlock Saiyan transformations.',
        hpMult: 1.0, spdMult: 1.1, dmgMult: 1.1, kbMult: 1.0
    },
    'Namekian': {
        name: 'Namekian',
        desc: 'Generational Resistance: Take up to 50% less damage the lower your HP falls.',
        hpMult: 1.3, spdMult: 1.0, dmgMult: 1.0, kbMult: 1.0
    },
    'Froster': {
        name: 'Froster',
        desc: 'Cruel: 10% chance when hit to ignore knockback and guarantee a dodge on the next attack.',
        hpMult: 0.8, spdMult: 1.2, dmgMult: 1.0, kbMult: 1.0
    },
    'Android': {
        name: 'Android',
        desc: 'Desperation: Speed increases up to +80% the lower your HP falls.',
        hpMult: 1.0, spdMult: 1.2, dmgMult: 1.1, kbMult: 1.1
    },
    'Bio-Android': {
        name: 'Bio-Android',
        desc: 'Absorb: Defeating enemies lets you absorb their specific stats with your tail instead of normal upgrades.',
        hpMult: 1.1, spdMult: 1.1, dmgMult: 1.1, kbMult: 1.1
    }
};

export function getRandomRaces(count) {
    let keys = Object.keys(RACES);
    let selected =[];
    while(selected.length < count) {
        let rnd = keys[Math.floor(Math.random() * keys.length)];
        if(!selected.includes(rnd)) {
            selected.push(rnd);
        }
    }
    return selected.map(k => RACES[k]);
}

// Function to generate a random name based on race
export function generateRaceName(raceName) {
    let name = '';
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    switch (raceName) {
        case 'Human':
            const humanFirst = ["Alex", "Ben", "Chris", "Dan", "Eve", "Mia", "Noah", "Sam", "Zoe", "Kyle", "Sarah", "Emily", "Jacob", "Olivia", "Ethan", "Sophia", "Lucas", "Ava", "Mason", "Isabella"];
            const humanLast = ["Smith", "Jones", "Lee", "Chen", "Kim", "Miller", "Davis", "Clark", "Brown", "Wilson", "Garcia", "Rodriguez", "Jackson", "White", "Moore", "King"];
            name = `${rand(humanFirst)} ${rand(humanLast)}`;
            break;
        case 'Saiyan':
        case 'Half-Saiyan':
            const vegPrefix = ["Carrot", "Cabba", "Radish", "Brocco", "Spinac", "Beet", "Celery", "Kohl", "Lettu", "Pump"];
            const vegSuffix = ["t", "la", "ge", "li", "lo", "ne", "ry", "bean", "ce", "kin"];
            name = `${rand(vegPrefix)}${rand(vegSuffix)}`;
            break;
        case 'Namekian':
            const namekianSyllables = ["Pico", "Dend", "Kami", "Nail", "Saich", "Guru", "Katat", "Moori", "Slugg", "Krill", "Fife"];
            const namekianSuffix = ["o", "e", "ian", "a", "us", "ah", "en", "i", "an", "el"];
            name = `${rand(namekianSyllables)}${rand(namekianSuffix)}`;
            break;
        case 'Froster':
            const frosterPrefix = ["Friez", "Chill", "Glaci", "Frost", "Cold", "Subz", "Cryo", "Zer", "Ice", "Blizz"];
            const frosterSuffix = ["a", "o", "er", "z", "one", "ax", "an", "on", "ic", "ard"];
            name = `${rand(frosterPrefix)}${rand(frosterSuffix)}`;
            break;
        case 'Android':
            const androidPrefix = ["Unit", "Model", "D", "Cyber", "Mech", "A", "Auto", "X"];
            const androidNumbers = ["13", "16", "17", "18", "19", "20", "21", "22", "23", "30", "31", "32", "40", "45", "50"];
            name = `${rand(androidPrefix)}-${rand(androidNumbers)}`;
            break;
        case 'Bio-Android':
            const bioPrefix = ["Cell", "Gen", "Bio", "Evo", "Syn", "Mut", "Form", "Apex"];
            const bioSuffix = ["id", "oid", "ix", "sis", "prime", "gen", "tient", "core"];
            name = `${rand(bioPrefix)}${rand(bioSuffix)}`;
            break;
        default:
            name = "Unknown Fighter";
            break;
    }
    return name;
}
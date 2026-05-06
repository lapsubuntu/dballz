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


// Centralized state container to prevent circular imports during refactoring
export const state = {
    blueBrawler: null,
    enemyBrawler: null,
    
    score: 0,
    senzuBeans: 3,
    
    // Meta Progression
    evolutionPoints: 0,
    playerAlignment: 0, 
    
    // Social / Revenge System
    savedContacts: [],
    pendingChats:[],
    revengeQueue:[],
    activeChatEnemy: null,
    
    // Engine State
    isPlaying: false,
    currentMode: 'MENU',
    hitStopFrames: 0,
    screenShake: 0,
    
    // Entities
    particles: [],
    kiBlasts:[],
    homingBlasts: [],
    kiBalls: [],
    kiGrenades: [],
    beams:[],
    
    // Scenery
    currentArena: null,
    playerSelectedRace: null
};
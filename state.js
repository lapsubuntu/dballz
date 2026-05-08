// Centralized state container to prevent circular imports during refactoring
export const state = {
    blueBrawler: null,
    enemyBrawler: null,
    
    score: 0,
    senzuBeans: 3,
    
    // Meta Progression
    evolutionPoints: 100,
    playerAlignment: 0, 
    
    // Social / Revenge System
    savedContacts:[],
    pendingChats:[],
    revengeQueue:[],
    activeChatEnemy: null,
    
    // Engine State
    isPlaying: false,
    currentMode: 'MENU',
    introTimer: 0,
    hitStopFrames: 0,
    screenShake: 0,
    
    // Ranged combat orchestration
    fairPlayTimer: 0, // When > 0, both brawlers are forced into ki attack focus to encourage beam clashes.
    
    // Entities
    particles: [],
    kiBlasts:[],
    homingBlasts: [],
    kiBalls:[],
    kiGrenades: [],
    beams:[],
    
    // Scenery
    currentArena: null,
    playerSelectedRace: null
};

import { state } from './state.js';
import { SKILL_TREE, MAX_EQUIPPED_SKILLS } from './config.js';
import { logCombat, updateProfileUI } from './ui.js';

let treePan = { x: -250, y: -250 };
let isDraggingTree = false;
let startDrag = { x: 0, y: 0 };

export function getEquippedCount() {
    return Object.values(SKILL_TREE).filter(s => s.equipped && s.id !== 'root').length;
}

export function getEquippedSkillIDs() {
    return Object.values(SKILL_TREE).filter(s => s.equipped && s.id !== 'root').map(s => s.id);
}

export function resetSkillTree() {
    state.evolutionPoints = 0;
    Object.values(SKILL_TREE).forEach(node => {
        if (node.id !== 'root') {
            node.unlocked = false;
            node.equipped = false;
        }
    });
    renderSkillTree();
}

export function renderSkillTree() {
    const nodesContainer = document.getElementById('tree-nodes');
    const svgLines = document.getElementById('tree-lines');
    
    nodesContainer.innerHTML = '';
    svgLines.innerHTML = '';

    document.getElementById('ui-ev-points').innerText = state.evolutionPoints;
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

export function handleNodeClick(nodeId) {
    let node = SKILL_TREE[nodeId];
    if (node.id === 'root') return;

    if ((node.id === 'race_2' || node.id === 'race_3') && (!state.blueBrawler || (state.blueBrawler.raceName !== 'Saiyan' && state.blueBrawler.raceName !== 'Half-Saiyan'))) {
        logCombat('Unlock Failed: Exclusive to Saiyan Heritage!');
        return;
    }

    if (!node.unlocked) {
        let parentNode = SKILL_TREE[node.parent];
        if (!parentNode.unlocked) {
            logCombat('Parent node must be unlocked first!');
            return;
        }
        if (state.evolutionPoints >= node.cost) {
            state.evolutionPoints -= node.cost;
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
    
    if (state.blueBrawler) {
        state.blueBrawler.updateStats(getEquippedSkillIDs());
        updateProfileUI();
    }
}

export function initSkillTreeEvents() {
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
}
// === CONSTANTS ===

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
    });
}


const images = {};

async function loadAllImages() {
    images.battleship = await loadImage('assets/battleship.png');
    images.carrier = await loadImage('assets/carrier.png');
    images.cruiser = await loadImage('assets/cruiser.png');
    images.destroyer = await loadImage('assets/destroyer.png');
    images.submarine = await loadImage('assets/submarine.png');
}



//hitpoint type definitions - 4 cannon calibers + AA + torpedo + hangar
const HITPOINT_TYPES = {
    in18: { //18-inch battleship guns
        range: 42000, damage: 200, maxHealth: 800,
        maxCooldown: 25, projectileSpeed: 820
    },
    in13: { //13-inch battlecruiser guns
        range: 35000, damage: 140, maxHealth: 600,
        maxCooldown: 18, projectileSpeed: 800
    },
    in9: { //9-inch heavy cruiser guns
        range: 25000, damage: 80, maxHealth: 400,
        maxCooldown: 12, projectileSpeed: 780
    },
    in6: { //6-inch light cruiser / secondary guns
        range: 15000, damage: 35, maxHealth: 150,
        maxCooldown: 6, projectileSpeed: 760
    },
    AA: { //cluster of ~3-4 AA guns
        range: 6000, damage: 8, maxHealth: 60,
        maxCooldown: 0.2, projectileSpeed: 880
    },
    torpedoMount: { //torpedo launcher, fires sideways only
        range: 12000, damage: 400, maxHealth: 100,
        maxCooldown: 30, projectileSpeed: 25 //torpedos are slow
    },
    hangarBay: {
        range: 0, damage: 0, maxHealth: 400,
        maxCooldown: 0, projectileSpeed: 0
    }
};

//ship templates - beam/length in meters, speeds in m/s
const SHIP_TEMPLATES = {
    destroyer: {
        beam: 12, length: 115, maxSpeed: 18, acceleration: 2, turnRate: 0.04,
        hitpoints: [
            {name: 'gun1', type: 'in6', relPosXY: [0, -45]},
            {name: 'gun2', type: 'in6', relPosXY: [0, 0]},
            {name: 'gun3', type: 'in6', relPosXY: [0, 40]},
            {name: 'torpL1', type: 'torpedoMount', relPosXY: [-6, -15]},
            {name: 'torpL2', type: 'torpedoMount', relPosXY: [-6, 15]},
            {name: 'torpR1', type: 'torpedoMount', relPosXY: [6, -15]},
            {name: 'torpR2', type: 'torpedoMount', relPosXY: [6, 15]},
            {name: 'AA1', type: 'AA', relPosXY: [5, -25]},
            {name: 'AA2', type: 'AA', relPosXY: [-5, -25]},
            {name: 'AA3', type: 'AA', relPosXY: [0, 25]}
        ]
    },
    lightCruiser: {
        beam: 20, length: 183, maxSpeed: 16, acceleration: 1.5, turnRate: 0.035,
        hitpoints: [
            {name: 'gun1', type: 'in6', relPosXY: [0, -75]},
            {name: 'gun2', type: 'in6', relPosXY: [0, -45]},
            {name: 'gun3', type: 'in6', relPosXY: [0, 20]},
            {name: 'gun4', type: 'in6', relPosXY: [0, 50]},
            {name: 'gun5', type: 'in6', relPosXY: [0, 75]},
            {name: 'torpL', type: 'torpedoMount', relPosXY: [-9, 0]},
            {name: 'torpR', type: 'torpedoMount', relPosXY: [9, 0]},
            {name: 'AA1', type: 'AA', relPosXY: [8, -20]},
            {name: 'AA2', type: 'AA', relPosXY: [-8, -20]},
            {name: 'AA3', type: 'AA', relPosXY: [8, 30]},
            {name: 'AA4', type: 'AA', relPosXY: [-8, 30]}
        ]
    },
    heavyCruiser: {
        beam: 22, length: 204, maxSpeed: 15, acceleration: 1.2, turnRate: 0.03,
        hitpoints: [
            {name: 'main1', type: 'in9', relPosXY: [0, -85]},
            {name: 'main2', type: 'in9', relPosXY: [0, -45]},
            {name: 'main3', type: 'in9', relPosXY: [0, 70]},
            {name: 'sec1', type: 'in6', relPosXY: [10, -20]},
            {name: 'sec2', type: 'in6', relPosXY: [-10, -20]},
            {name: 'sec3', type: 'in6', relPosXY: [10, 10]},
            {name: 'sec4', type: 'in6', relPosXY: [-10, 10]},
            {name: 'sec5', type: 'in6', relPosXY: [10, 40]},
            {name: 'sec6', type: 'in6', relPosXY: [-10, 40]},
            {name: 'torpL', type: 'torpedoMount', relPosXY: [-10, 25]},
            {name: 'torpR', type: 'torpedoMount', relPosXY: [10, 25]},
            {name: 'AA1', type: 'AA', relPosXY: [9, -35]},
            {name: 'AA2', type: 'AA', relPosXY: [-9, -35]},
            {name: 'AA3', type: 'AA', relPosXY: [9, 55]},
            {name: 'AA4', type: 'AA', relPosXY: [-9, 55]}
        ]
    },
    battlecruiser: {
        beam: 30, length: 231, maxSpeed: 14, acceleration: 1.0, turnRate: 0.025,
        hitpoints: [
            {name: 'main1', type: 'in13', relPosXY: [0, -95]},
            {name: 'main2', type: 'in13', relPosXY: [0, -55]},
            {name: 'main3', type: 'in13', relPosXY: [0, 80]},
            {name: 'sec1', type: 'in6', relPosXY: [12, -25]},
            {name: 'sec2', type: 'in6', relPosXY: [-12, -25]},
            {name: 'sec3', type: 'in6', relPosXY: [12, 15]},
            {name: 'sec4', type: 'in6', relPosXY: [-12, 15]},
            {name: 'sec5', type: 'in6', relPosXY: [12, 50]},
            {name: 'sec6', type: 'in6', relPosXY: [-12, 50]},
            {name: 'AA1', type: 'AA', relPosXY: [0, -75]}, //front
            {name: 'AA2', type: 'AA', relPosXY: [12, -40]},
            {name: 'AA3', type: 'AA', relPosXY: [-12, -40]},
            {name: 'AA4', type: 'AA', relPosXY: [12, 35]},
            {name: 'AA5', type: 'AA', relPosXY: [-12, 35]},
            {name: 'AA6', type: 'AA', relPosXY: [0, 95]} //rear
        ]
    },
    battleship: {
        beam: 36, length: 267, maxSpeed: 12, acceleration: 0.8, turnRate: 0.02,
        hitpoints: [
            {name: 'main1', type: 'in18', relPosXY: [0, -110]},
            {name: 'main2', type: 'in18', relPosXY: [0, -65]},
            {name: 'main3', type: 'in18', relPosXY: [0, 90]},
            {name: 'sec1', type: 'in6', relPosXY: [15, -35]},
            {name: 'sec2', type: 'in6', relPosXY: [-15, -35]},
            {name: 'sec3', type: 'in6', relPosXY: [15, 0]},
            {name: 'sec4', type: 'in6', relPosXY: [-15, 0]},
            {name: 'sec5', type: 'in6', relPosXY: [15, 40]},
            {name: 'sec6', type: 'in6', relPosXY: [-15, 40]},
            {name: 'AA1', type: 'AA', relPosXY: [0, -90]}, //front
            {name: 'AA2', type: 'AA', relPosXY: [14, -50]},
            {name: 'AA3', type: 'AA', relPosXY: [-14, -50]},
            {name: 'AA4', type: 'AA', relPosXY: [14, -15]},
            {name: 'AA5', type: 'AA', relPosXY: [-14, -15]},
            {name: 'AA6', type: 'AA', relPosXY: [14, 25]},
            {name: 'AA7', type: 'AA', relPosXY: [-14, 25]},
            {name: 'AA8', type: 'AA', relPosXY: [0, 115]} //rear
        ]
    },
    carrier: {
        beam: 45, length: 266, maxSpeed: 13, acceleration: 0.9, turnRate: 0.022,
        hitpoints: [
            {name: 'hangar1', type: 'hangarBay', relPosXY: [0, -40]},
            {name: 'hangar2', type: 'hangarBay', relPosXY: [0, 40]},
            {name: 'AA1', type: 'AA', relPosXY: [18, -100]},
            {name: 'AA2', type: 'AA', relPosXY: [-18, -100]},
            {name: 'AA3', type: 'AA', relPosXY: [18, -40]},
            {name: 'AA4', type: 'AA', relPosXY: [-18, -40]},
            {name: 'AA5', type: 'AA', relPosXY: [18, 20]},
            {name: 'AA6', type: 'AA', relPosXY: [-18, 20]},
            {name: 'AA7', type: 'AA', relPosXY: [18, 80]},
            {name: 'AA8', type: 'AA', relPosXY: [-18, 80]}
        ]
    }
};

//aircraft templates - null for now until carriers spawn them
const AIRCRAFT_TEMPLATES = {
    fighterSquadron: {maxHealth: 24, maxSpeed: 150, turnRate: 0.3, squadSize: 12, healthPerUnit: 2},
    torpedoSquadron: {maxHealth: 10, maxSpeed: 120, turnRate: 0.2, squadSize: 5, healthPerUnit: 2},
    heavyBomberSquadron: {maxHealth: 50, maxSpeed: 90, turnRate: 0.1, squadSize: 5, healthPerUnit: 10}
};

//targeting priority - lower number = higher priority, 10 = can't target this type
//big guns prefer big targets, small guns prefer small targets
const PRIORITY = {
    in18: {battleship: 1, carrier: 2, battlecruiser: 3, heavyCruiser: 4, lightCruiser: 5, destroyer: 6},
    in13: {battlecruiser: 1, carrier: 2, battleship: 3, heavyCruiser: 4, lightCruiser: 5, destroyer: 6},
    in9:  {heavyCruiser: 1, battlecruiser: 2, lightCruiser: 3, carrier: 4, battleship: 5, destroyer: 6},
    in6:  {lightCruiser: 1, destroyer: 2, heavyCruiser: 3, battlecruiser: 4, carrier: 5, battleship: 6}
    //AA = distance-based (aircraft only), torpedoMount = no auto-targeting yet
};

//gamemode definitions
const GAMEMODES = {
    supremacy: {
        name: 'Supremacy',
        description: 'One of each ship type per team',
        spawnShips: ['destroyer', 'lightCruiser', 'heavyCruiser', 'battlecruiser', 'battleship']
        //carrier excluded for now since aircraft not implemented
    }
};

//default team colors
const TEAM_COLORS = ['#4488ff', '#ff4444', '#44ff44', '#ffff44'];
const FACTION_COLORS = [
    '#4488ff', '#44aaff', '#4466dd', '#66aaff', //blues
    '#ff4444', '#ff6666', '#dd4444', '#ff8888', //reds
    '#44ff44', '#66ff66', '#44dd44', '#88ff88', //greens
    '#ffff44', '#ffff66', '#dddd44', '#ffff88'  //yellows
];

// === GAME STATE ===

let game = {
    phase: 'login', //'login', 'menu', 'playing'
    currentGamemode: 'supremacy',
    teams: {}, //teams[teamId] = {name, color, factions: {}}
    //factions[factionId] = {name, color, type: 'player'|'ai', playerId, ready}
    activeAgents: {}, //activeAgents[teamId][factionId] = {ships: [], aircraft: [], bases: []}
    activeProjectiles: [],
    activeVFX: [],
    players: {}, //players[playerId] = {name, faction, team}
    isPaused: false,
    time: 0
};

let localPlayer = {
    id: null,
    name: null,
    team: null,
    faction: null,
    ready: false
};

let camera = {
    x: 0, y: 0, //world center position
    zoom: 1, //world meters per pixel (higher = more zoomed out)
    minZoom: 0.1,
    maxZoom: 50 //50km visible at 1080p roughly
};

let input = {
    selectedAgents: [],
    isDragging: false,
    dragStartXY: null,
    dragEndXY: null,
    mouseScreenXY: [0, 0],
    mouseWorldXY: [0, 0],
    shiftHeld: false,
    hoveredShip: null, //ship currently under mouse cursor
    hoveredHitpoint: null //hitpoint currently under mouse (if any)
};

// === CANVAS SETUP ===

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// === UTILITY FUNCTIONS ===

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
function normalize(v) {
    let len = Math.hypot(v[0], v[1]);
    return len > 0.0001 ? [v[0]/len, v[1]/len] : [1, 0];
}
function angleToDir(rad) { return [Math.cos(rad), Math.sin(rad)]; }
function dirToAngle(dir) { return Math.atan2(dir[1], dir[0]); }
//normalize angle to [-PI, PI]
function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}
function randomId() { return Math.random().toString(36).substr(2, 8); }
function randomAiName() {
    const prefixes = ['Admiral', 'Captain', 'Commander', 'Fleet'];
    const names = ['Alpha', 'Bravo', 'Echo', 'Delta', 'Zulu', 'Tango', 'Sierra'];
    return prefixes[Math.floor(Math.random()*prefixes.length)] + ' ' +
           names[Math.floor(Math.random()*names.length)] + '-' +
           Math.floor(Math.random()*100);
}

// === COORDINATE TRANSFORMS ===

function screenToWorld(sx, sy) {
    return [
        (sx - canvas.width/2) * camera.zoom + camera.x,
        (sy - canvas.height/2) * camera.zoom + camera.y
    ];
}

function worldToScreen(wx, wy) {
    return [
        (wx - camera.x) / camera.zoom + canvas.width/2,
        (wy - camera.y) / camera.zoom + canvas.height/2
    ];
}

// === PLAYER IDENTITY (localStorage) ===

function loadPlayerIdentity() {
    let stored = localStorage.getItem('navalCommandPlayer');
    if (stored) {
        let data = JSON.parse(stored);
        localPlayer.id = data.id;
        localPlayer.name = data.name;
        return true;
    }
    return false;
}

function savePlayerIdentity() {
    let nameInput = document.getElementById('playerNameInput');
    let idInput = document.getElementById('playerIdInput');
    let name = nameInput.value.trim();
    let id = idInput.value.trim();
    if (!name) { alert('Please enter a name'); return; }
    if (!id) id = randomId(); //auto-generate if empty

    localPlayer.name = name;
    localPlayer.id = id;
    localStorage.setItem('navalCommandPlayer', JSON.stringify({name, id}));

    document.getElementById('loginPopup').classList.add('hidden');
    game.phase = 'menu';
    showMenu();
}

function showLoginPopup() {
    let popup = document.getElementById('loginPopup');
    popup.classList.remove('hidden');
    if (localPlayer.name) document.getElementById('playerNameInput').value = localPlayer.name;
    if (localPlayer.id) document.getElementById('playerIdInput').value = localPlayer.id;
}

// === MENU SYSTEM ===

function showMenu() {
    document.getElementById('menuOverlay').classList.remove('hidden');
    initializeTeams();
    renderMenu();
}

function hideMenu() {
    document.getElementById('menuOverlay').classList.add('hidden');
}

function initializeTeams() {
    //start with 2 active teams by default
    game.teams = {};
    for (let i = 0; i < 2; i++) {
        game.teams[i] = {
            name: 'Team ' + (i + 1),
            color: TEAM_COLORS[i],
            active: true,
            factions: {}
        };
    }
    //teams 3 and 4 inactive initially
    for (let i = 2; i < 4; i++) {
        game.teams[i] = {
            name: 'Team ' + (i + 1),
            color: TEAM_COLORS[i],
            active: false,
            factions: {}
        };
    }

    //add local player to team 0
    let playerFactionId = randomId();
    game.teams[0].factions[playerFactionId] = {
        name: localPlayer.name,
        color: FACTION_COLORS[0],
        type: 'player',
        playerId: localPlayer.id,
        ready: false
    };
    localPlayer.team = 0;
    localPlayer.faction = playerFactionId;

    //add one AI to team 1
    let aiFactionId = randomId();
    game.teams[1].factions[aiFactionId] = {
        name: randomAiName(),
        color: FACTION_COLORS[4],
        type: 'ai',
        playerId: null,
        ready: true //AIs are always ready
    };
}

function renderMenu() {
    let grid = document.getElementById('teamsGrid');
    grid.innerHTML = '';

    let activeTeamCount = Object.values(game.teams).filter(t => t.active).length;
    let maxFactions = activeTeamCount <= 2 ? 4 : 2; //4 per team if 2 teams, 2 per team if 3-4 teams

    for (let teamId = 0; teamId < 4; teamId++) {
        let team = game.teams[teamId];
        let col = document.createElement('div');
        col.className = 'teamColumn' + (team.active ? '' : ' inactive');
        col.dataset.teamId = teamId;

        if (team.active) {
            col.innerHTML = `
                <div class="teamHeader">
                    <input type="text" class="teamName" value="${team.name}"
                           onchange="updateTeamName(${teamId}, this.value)">
                </div>
                <div class="factionsList" id="factions-${teamId}"></div>
                ${Object.keys(team.factions).length < maxFactions ?
                    `<button class="addFactionBtn" onclick="showAddFactionPopup(event, ${teamId})">+</button>` : ''}
            `;
            grid.appendChild(col);

            //render factions
            let factionsList = document.getElementById('factions-' + teamId);
            for (let factionId in team.factions) {
                let faction = team.factions[factionId];
                let isLocal = faction.playerId === localPlayer.id;
                let row = document.createElement('div');
                row.className = 'factionRow';
                row.innerHTML = `
                    <input type="color" id="color-${factionId}" value="${faction.color}"
                           onchange="updateFactionColor('${teamId}', '${factionId}', this.value)">
                    <div class="factionColor" style="background:${faction.color}"
                         onclick="document.getElementById('color-${factionId}').click()"></div>
                    <span class="factionName">${faction.name}</span>
                    <span class="factionType">(${faction.type})</span>
                    <span class="${faction.ready ? 'factionReady' : 'factionNotReady'}">
                        ${faction.ready ? 'Ready' : 'Not Ready'}
                    </span>
                    ${!isLocal && faction.type === 'ai' ?
                        `<button class="removeBtn" onclick="removeFaction(${teamId}, '${factionId}')">x</button>` : ''}
                `;
                factionsList.appendChild(row);
            }
        } else {
            col.innerHTML = `<button class="activateTeamBtn" onclick="activateTeam(${teamId})">+</button>`;
        }
        grid.appendChild(col);
    }

    //update ready button
    let readyBtn = document.getElementById('readyBtn');
    let playerFaction = game.teams[localPlayer.team]?.factions[localPlayer.faction];
    if (playerFaction) {
        readyBtn.textContent = playerFaction.ready ? 'Not Ready' : 'Ready';
        readyBtn.className = playerFaction.ready ? 'notReady' : '';
    }
}

function updateTeamName(teamId, name) {
    game.teams[teamId].name = name;
    setAllPlayersNotReady();
}

function updateFactionColor(teamId, factionId, color) {
    game.teams[teamId].factions[factionId].color = color;
    renderMenu();
    setAllPlayersNotReady();
}

function activateTeam(teamId) {
    game.teams[teamId].active = true;
    renderMenu();
    setAllPlayersNotReady();
}

function showAddFactionPopup(event, teamId) {
    //remove any existing popup
    let existing = document.querySelector('.addFactionPopup');
    if (existing) existing.remove();

    let popup = document.createElement('div');
    popup.className = 'addFactionPopup';
    popup.style.left = event.clientX + 'px';
    popup.style.top = event.clientY + 'px';
    popup.innerHTML = `
        <button onclick="addFaction(${teamId}, 'ai'); this.parentElement.remove()">Add AI</button>
        <button onclick="addFaction(${teamId}, 'player'); this.parentElement.remove()">Join as Player</button>
    `;
    document.body.appendChild(popup);

    //close popup on click outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 10);
}

function addFaction(teamId, type) {
    let factionId = randomId();
    let factionIndex = Object.keys(game.teams[teamId].factions).length;
    let colorIndex = teamId * 4 + factionIndex;

    if (type === 'ai') {
        game.teams[teamId].factions[factionId] = {
            name: randomAiName(),
            color: FACTION_COLORS[colorIndex % FACTION_COLORS.length],
            type: 'ai',
            playerId: null,
            ready: true
        };
    } else {
        //move local player to this team/faction
        if (localPlayer.team !== null && localPlayer.faction !== null) {
            delete game.teams[localPlayer.team].factions[localPlayer.faction];
        }
        game.teams[teamId].factions[factionId] = {
            name: localPlayer.name,
            color: FACTION_COLORS[colorIndex % FACTION_COLORS.length],
            type: 'player',
            playerId: localPlayer.id,
            ready: false
        };
        localPlayer.team = teamId;
        localPlayer.faction = factionId;
    }
    renderMenu();
    setAllPlayersNotReady();
}

function removeFaction(teamId, factionId) {
    delete game.teams[teamId].factions[factionId];
    renderMenu();
    setAllPlayersNotReady();
}

function setAllPlayersNotReady() {
    for (let teamId in game.teams) {
        for (let factionId in game.teams[teamId].factions) {
            let faction = game.teams[teamId].factions[factionId];
            if (faction.type === 'player') faction.ready = false;
        }
    }
    localPlayer.ready = false;
    renderMenu();
}

function toggleReady() {
    let faction = game.teams[localPlayer.team]?.factions[localPlayer.faction];
    if (!faction) return;

    faction.ready = !faction.ready;
    localPlayer.ready = faction.ready;
    renderMenu();

    checkAllReady();
}

function checkAllReady() {
    let allReady = true;
    let hasFactions = false;

    for (let teamId in game.teams) {
        if (!game.teams[teamId].active) continue;
        for (let factionId in game.teams[teamId].factions) {
            hasFactions = true;
            if (!game.teams[teamId].factions[factionId].ready) {
                allReady = false;
                break;
            }
        }
    }

    if (allReady && hasFactions) {
        startGameWithGameMode();
    }
}

function onGamemodeChange() {
    game.currentGamemode = document.getElementById('gamemodeSelect').value;
    setAllPlayersNotReady();
}

class Agent{
    constructor(teamId, position, orientation, templateName){
        this.id = randomId();
        this.team = teamId;
        this.position = [...position];
        this.orientation = normalize([...orientation]);
        this.templateName = templateName;
        this.currentSpeed = 0;
        this.targetPosition = null;
        this.targetMode = 'auto'; //'auto', 'agent', 'hitpoint'
        this.lockedTarget = null;
        this.lockedHitpoint = null;
        this.hitpoints = {};
        this.health = 0;
        this.maxHealth = 0;
    }
}

class Ship extends Agent{
    constructor(teamId, factionId, shipType, positionXY, orientationDir, tHealth){
        this.id = randomId();
        this.team = teamId;
        this.faction = factionId;
        this.shipType = shipType;
        this.positionXY = [...positionXY];
        this.orientationDir = normalize(orientationDir); //always normalized unit vector, but unnecessary atm.
        this.currentSpeed = 0;
        this.targetPositionXY = null;
        this.targetMode = 'auto'; //'auto', 'agent', 'hitpoint'
        this.lockedTarget = null;
        this.lockedHitpoint = null;
        this.hitpoints = hitpoints;
        this.health = tHealth;
        this.maxHealth = tHealth
    }
}

class Aircraft extends Agent{
    constructor(teamId, factionId, aircraftType, positionXYZ, orientationDir, tHealth){
        this.id = randomId();
        this.team = teamId;
        this.faction = factionId;
        this.aircraftType = aircraftType;
        this.positionXY = [...positionXYZ];
        this.orientationDir = normalize(orientationDir); //always normalized unit vector, but unnecessary atm.
        this.currentSpeed = 0;
        this.targetPositionXY = null;
        this.targetMode = 'auto'; //'auto', 'agent', 'hitpoint'
        this.lockedTarget = null;
        this.lockedHitpoint = null;
        this.hitpoints = null;
        this.health = tHealth;
        this.maxHealth = tHealth;
    }
}

//bases are just collections of hitpoints on land.

// === AGENT CREATION ===
//checks out for efficiency.
function createShip(teamId, factionId, shipType, positionXY, orientationDir) {
    let template = SHIP_TEMPLATES[shipType];

    //initialize hitpoints from template
    let hitpoints = {};
    let totalHealth = 0;
    for (let hpDef of template.hitpoints) {
        let hpType = HITPOINT_TYPES[hpDef.type];
        hitpoints[hpDef.name] = {
            type: hpDef.type,
            relPosXY: [...hpDef.relPosXY], //... deepcopies the array by iterating out its elements (but if hpDef.relPosXY was made of subarrays, then this will merely put pointers to those sub arraysin this array.)
            health: hpType.maxHealth,
            maxHealth: hpType.maxHealth,
            cooldown: 0,
            destroyed: false
        };
        totalHealth += hpType.maxHealth;
    }

    return new Ship(teamId, factionId, shipType, positionXY, orientationDir, totalHealth);
}

//orientationDir should usually just be the same as, say, the aircraft carrier's facing direction, or the base's airstrip facing direction.
function createAircraft(teamId, factionId, aircraftType, positionXYZ, orientationDir) {
    let template = AIRCRAFT_TEMPLATES[aircraftType];
    return new Aircraft(teamId, factionId, aircraftType, positionXYZ, orientationDir, template.maxHealth);
}

function spawnGameModeAgents(){

    switch (game.currentGamemode) {
        case 'supremacy':
            return spawnGameModeSupremacyFleet(teamId, factionId, centerXY, facingDir);
        default:
            return [];
    }
}

function spawnGameModeSupremacyFleet(teamId, factionId, centerXY, facingDir) {
    let ships = GAMEMODES.supremacy.spawnShips;
    let spacing = 400; //meters between ships
    let agents = [];

    //arrange ships in a line perpendicular to facing direction --> this is a temporary solution. We will eventually 
    //spawn them in nice formations.
    let perpDir = [-facingDir[1], facingDir[0]];
    let startOffset = -((ships.length - 1) / 2) * spacing;

    for (let i = 0; i < ships.length; i++) {
        let offset = startOffset + i * spacing;
        let posXY = [
            centerXY[0] + perpDir[0] * offset,
            centerXY[1] + perpDir[1] * offset
        ];
        let ship = createShip(teamId, factionId, ships[i], posXY, facingDir);
        if (ship) agents.push(ship);
    }
    return agents;
}



function spawnSupremacyAircraft(){

    let aircrafts = [];
    for (let i = 0; i < 2; i++) {
        let aircraft = createAircraft(teamId, factionId, 'fighterSquadron', posXYZ, facingDir);
        aircrafts.push(aircraft);
    }
    return aircrafts;
}

//where formation is of the type:
//{ships: {shipType: {position}}}
//{aircraft: {aircraftType: {position}}}
//{bases: {baseType: {position}}}
//these can repeated since we don't care about individual duplicates since they are well duplicates, so we can just run it for each.
//

//keep in mind game coordinates have 0,0 at top left, so up on map is negative y, down on map is positive y. left on map is negative x, right on map is positive x.
//formationExmp = {shipFormation: {carrier: {position: [0, 0]}, battleship: {position: [-500, -80]}, battlecruiser: {position: [500,-80]}, heavycruiser: {position: [-500,-580]}, heavycruiser: {position: [500, -580]}, lightcruiser: {position: [-500,-1080]},lightcruiser: {position: [500,-1080]}, destroyer: {position: [-500, 420]},lightcruiser: {position: [500,420]}, destroyer: {position: [0,-1080]}}, 
///aircraftFormation: {fighterSquadron: {position: [0, 100]}},

//}

//tests --> check if it works for all possible game configurations (e.g 2 teams with 1 faction each, 2 teams with 2 factions each, 3 teams with 1 or 2 each or some mix, 4 teams with 1 faction each, 4 w/ 2 factions each, etc.)




const formationSupremacyStarter = {
    formationOrientation: [0, -1],
    shipFormation: [
        { type: "carrier", position: [0, 0], orientation: [0, -1] },
        { type: "battleship", position: [-500, -80], orientation: [0, -1] },
        { type: "battlecruiser", position: [500, -80], orientation: [0, -1] },
        { type: "heavycruiser", position: [-500, -580], orientation: [0, -1] },
        { type: "heavycruiser", position: [500, -580], orientation: [0, -1] },
        { type: "lightcruiser", position: [-500, -1080], orientation: [0, -1] },
        { type: "lightcruiser", position: [500, -1080], orientation: [0, -1] },
        { type: "destroyer", position: [-500, 420], orientation: [0, -1] },
        { type: "lightcruiser", position: [500, 420], orientation: [0, -1] },
        { type: "destroyer", position: [0, -1080], orientation: [0, -1] }
    ],
    aircraftFormation: [
        { type: "fighterSquadron", position: [0, 100], orientation: [0, -1] }
    ]
};

const positionsOfFormationsSupremacy = {
    {factions: 8, positionsOfMainFleets: [21000,15000],[29000,15000]],[[21000,35000],[29000,35000]],[[15000,21000],[15000,29000]],[[35000,21000],[35000,29000]],[[21000,35000],[29000,35000]],[[21000,15000],[29000,15000]],[[15000,21000],[15000,29000]],[[35000,21000],[35000,29000]]]} //on map, 21km to right, 15km to top, 29km to right, 15km to bottom, 21km to left, 15km to top, 29km to left, 15km to bottom
    {factions: 4, positionsOfMainFleets: [25000,15000],[25000,35000],[15000,25000],[35000,25000]]} 
}//we'll make their orientations respectively too. So like for 21000,15000 & 29000,15000 OR 25000,15000its orientation should be 0,1 because 1 is down.
//for, say, 21000,35000 or 25000,35000 or 29000,35000, its orientation should be 1,0, since its to the right which is positive x in the cooordinates. Remember the map is 50km x 50km

//,baseFormations: {} added later possibly.


//baseFormations: {} added later 
function spawnFormation(formations){
    for (let formation of formations){  
    if(formation.shipFormation){
            for (let ship in formation.shipFormation){
                createShip(ship.teamId, ship.factionId, ship.type, ship.position, ship.orientation);
            }
        }
        if(formation.aircraftFormation){
            for (let aircraft in formation.aircraftFormation){
                createAircraft(aircraft.position);
            }
        }
        if(formation.baseFormations){
            for (let base in formation.baseFormations){
                createBase(base.position);
            }
        }
    }
}

//we're going to have a big fleet spawner function that initiates all agents given formations we pass to it.
//we will make a list of certain const = {};// formations will use these by default. 



// === GAME START ===

function startGameWithGameMode() {
    game.phase = 'playing';
    hideMenu();

    //initialize activeAgents structure
    game.activeAgents = {};
    for (let teamId in game.teams) {
        if (!game.teams[teamId].active) continue;
        game.activeAgents[teamId] = {};
        for (let factionId in game.teams[teamId].factions) {
            game.activeAgents[teamId][factionId] = {
                ships: [],
                aircraft: [], //null/empty for now
                bases: [] //null/empty for now
            };
        }
    }

    //spawn fleets based on gamemode --> this is only meaningful in the context that the center eventually means something
    //when we spawn them in formations later on.
    let teamPositions = [
        {center: [-3000, 0], facing: [1, 0]},   //team 0 spawns left, faces right
        {center: [3000, 0], facing: [-1, 0]},   //team 1 spawns right, faces left
        {center: [0, -3000], facing: [0, 1]},   //team 2 spawns top, faces down
        {center: [0, 3000], facing: [0, -1]}    //team 3 spawns bottom, faces up
    ];

    for (let teamId in game.activeAgents) {
        let teamIdx = parseInt(teamId);
        let pos = teamPositions[teamIdx];
        let factionOffsetIdx = 0;

        for (let factionId in game.activeAgents[teamId]) {
            //offset each faction slightly within team area
            let factionOffset = (factionOffsetIdx - 0.5) * 800;
            let perpDir = [-pos.facing[1], pos.facing[0]];
            let factionCenter = [
                pos.center[0] + perpDir[0] * factionOffset,
                pos.center[1] + perpDir[1] * factionOffset
            ];

            let ships = spawnGameModeSupremacyFleet(teamId, factionId, factionCenter, pos.facing);
            game.activeAgents[teamId][factionId].ships = ships;
            factionOffsetIdx++;
        }
    }

    game.activeProjectiles = [];
    game.activeVFX = [];
    game.time = 0;
    game.isPaused = false;

    //start game loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// === ITERATION HELPERS ===

function forEachShip(callback) {
    for (let teamId in game.activeAgents) {
        for (let factionId in game.activeAgents[teamId]) {
            for (let ship of game.activeAgents[teamId][factionId].ships) {
                callback(ship, teamId, factionId);
            }
        }
    }
}

function forEachEnemyShip(myTeamId, callback) {
    for (let teamId in game.activeAgents) {
        if (parseInt(teamId) === parseInt(myTeamId)) continue;
        for (let factionId in game.activeAgents[teamId]) {
            for (let ship of game.activeAgents[teamId][factionId].ships) {
                callback(ship, teamId, factionId);
            }
        }
    }
}

// === GAME LOOP ===

let lastTime = 0;

function gameLoop(currentTime) {
    let dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    if (dt > 0.1) dt = 0.1; //cap dt to prevent spiral of death on lag spikes

    if (!game.isPaused && game.phase === 'playing') {
        targetAndFireAndUpdateCollisions(dt);
        updateProjectiles(dt);
        updateMovement(dt);
        updateVFX(dt);
        pruneDeadAgents();
        game.time += dt;
    }

    //always update hover even when paused
    if (game.phase === 'playing') updateHover();

    render();
    requestAnimationFrame(gameLoop);
}

// === MOVEMENT ===

function updateMovement(dt) {
    forEachShip(ship => {
        let template = SHIP_TEMPLATES[ship.shipType];

        if (!ship.targetPositionXY) {
            //no target - decelerate to stop
            if (ship.currentSpeed > 0) {
                ship.currentSpeed = Math.max(0, ship.currentSpeed - template.acceleration * dt);
            }
            return;
        }

        let dx = ship.targetPositionXY[0] - ship.positionXY[0];
        let dy = ship.targetPositionXY[1] - ship.positionXY[1];
        let distToTarget = Math.hypot(dx, dy);

        //arrived at destination
        if (distToTarget < 10) {
            ship.targetPositionXY = null;
            return;
        }

        //calculate target angle and current angle
        let targetAngle = Math.atan2(dy, dx);
        let currentAngle = dirToAngle(ship.orientationDir);
        let angleDiff = normalizeAngle(targetAngle - currentAngle);

        //turn toward target
        let maxTurn = template.turnRate * dt;
        let turnAmount = clamp(angleDiff, -maxTurn, maxTurn);
        let newAngle = currentAngle + turnAmount;
        ship.orientationDir = normalize([Math.cos(newAngle), Math.sin(newAngle)]);

        //accelerate/decelerate based on angle to target
        //slow down when turning sharply
        let angleFactor = 1 - Math.min(Math.abs(angleDiff) / Math.PI, 0.7);
        let targetSpeed = template.maxSpeed * angleFactor;

        if (ship.currentSpeed < targetSpeed) {
            ship.currentSpeed = Math.min(targetSpeed, ship.currentSpeed + template.acceleration * dt);
        } else {
            ship.currentSpeed = Math.max(targetSpeed, ship.currentSpeed - template.acceleration * dt);
        }

        //move forward
        ship.positionXY[0] += ship.orientationDir[0] * ship.currentSpeed * dt;
        ship.positionXY[1] += ship.orientationDir[1] * ship.currentSpeed * dt;
    });
}

// === TARGETING AND FIRING ===

function targetAndFireAndUpdateCollisions(dt) {
    forEachShip(ship => {
        //update all cooldowns first
        for (let hpName in ship.hitpoints) {
            let hp = ship.hitpoints[hpName];
            if (!hp.destroyed && hp.cooldown > 0) {
                hp.cooldown = Math.max(0, hp.cooldown - dt);
            }
        }

        if (ship.targetMode === 'auto') {
            //non-AA hitpoints: priority-based targeting against ships
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type === 'AA') continue;
                if (hp.cooldown > 0.0001) continue;

                let best = findBestShipTarget(ship, hp);
                if (best) {
                    fireAtShip(ship, hp, best);
                    hp.cooldown = HITPOINT_TYPES[hp.type].maxCooldown;
                }
            }

            //AA hitpoints: distance-based, targets aircraft only (not implemented yet)
            //will add when aircraft exist

        } else if (ship.targetMode === 'agent' || ship.targetMode === 'hitpoint') {
            //locked onto specific target
            let target = ship.lockedTarget;

            //validate target still exists and is enemy
            if (!target || target.health <= 0) {
                ship.targetMode = 'auto';
                ship.lockedTarget = null;
                ship.lockedHitpoint = null;
                return;
            }

            //non-AA hitpoints fire at locked target
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type === 'AA') continue;
                if (hp.cooldown > 0.0001) continue;

                let range = HITPOINT_TYPES[hp.type].range;
                let d = dist(ship.positionXY, target.positionXY);
                if (d <= range) {
                    fireAtShip(ship, hp, target, ship.lockedHitpoint);
                    hp.cooldown = HITPOINT_TYPES[hp.type].maxCooldown;
                }
            }

            //keep updating target position for pursuit
            ship.targetPositionXY = [...target.positionXY];
        }
    });
}

function findBestShipTarget(ship, hp) {
    let hpType = hp.type;
    let range = HITPOINT_TYPES[hpType].range;
    let priorities = PRIORITY[hpType];
    if (!priorities) return null;

    let bestTarget = null;
    let bestPriority = 10;

    forEachEnemyShip(ship.team, enemy => {
        let d = dist(ship.positionXY, enemy.positionXY);
        if (d > range) return;

        let priority = priorities[enemy.shipType] ?? 10;
        if (priority < bestPriority) {
            bestPriority = priority;
            bestTarget = enemy;
        }
    });

    return bestTarget;
}

function getHitpointWorldPos(ship, hp) {
    //transform hitpoint relative position by ship orientation
    let xDir = ship.orientationDir[0];
    let yDir = ship.orientationDir[1];
    let relX = hp.relPosXY[0];
    let relY = hp.relPosXY[1];

    //rotate relative position by orientation
    //note: relY is along ship length (forward is positive Y in local space)
    //ship.orientationDir points in the direction the ship is facing
    return [
        ship.positionXY[0] + relX * (-yDir) + relY * xDir,
        ship.positionXY[1] + relX * xDir + relY * yDir
    ];
}

function fireAtShip(shooter, hp, target, targetHitpointName = null) {
    let hpWorldXY = getHitpointWorldPos(shooter, hp);
    let projSpeed = HITPOINT_TYPES[hp.type].projectileSpeed;

    //determine aim point - either specific hitpoint or ship center
    let baseAimXY;
    if (targetHitpointName && target.hitpoints[targetHitpointName]) {
        baseAimXY = getHitpointWorldPos(target, target.hitpoints[targetHitpointName]);
    } else {
        baseAimXY = [...target.positionXY];
    }

    //lead targeting: predict where target will be
    let d = dist(hpWorldXY, baseAimXY);
    let timeToHit = d / projSpeed;

    let targetVelXY = [
        target.orientationDir[0] * target.currentSpeed,
        target.orientationDir[1] * target.currentSpeed
    ];
    let aimPointXY = [
        baseAimXY[0] + targetVelXY[0] * timeToHit,
        baseAimXY[1] + targetVelXY[1] * timeToHit
    ];

    //accuracy error applied at fire time, scales with distance
    let errorFactor = 0.04; //4% of distance as max error
    let errorX = d * errorFactor * (Math.random() * 2 - 1);
    let errorY = d * errorFactor * (Math.random() * 2 - 1);
    let destinationXY = [aimPointXY[0] + errorX, aimPointXY[1] + errorY];

    let dirToTarget = normalize([destinationXY[0] - hpWorldXY[0], destinationXY[1] - hpWorldXY[1]]);

    game.activeProjectiles.push({
        id: randomId(),
        positionXY: [...hpWorldXY],
        velocityXY: [dirToTarget[0] * projSpeed, dirToTarget[1] * projSpeed],
        destinationXY: destinationXY,
        damage: HITPOINT_TYPES[hp.type].damage,
        sourceTeam: shooter.team,
        type: hp.type,
        targetShip: target
    });
}

// === PROJECTILE UPDATES ===

function updateProjectiles(dt) {
    for (let i = game.activeProjectiles.length - 1; i >= 0; i--) {
        let proj = game.activeProjectiles[i];

        //move projectile
        proj.positionXY[0] += proj.velocityXY[0] * dt;
        proj.positionXY[1] += proj.velocityXY[1] * dt;

        //check if reached destination
        let toDest = dist(proj.positionXY, proj.destinationXY);
        if (toDest < 20) { //close enough to destination
            //check if destination is inside any enemy ship
            let hitShip = findShipAtPoint(proj.destinationXY, proj.sourceTeam);
            if (hitShip) {
                applyDamageToShip(hitShip, proj.damage, proj.destinationXY);
                spawnVFX('hit', proj.destinationXY);
            } else {
                spawnVFX('splash', proj.destinationXY);
            }
            game.activeProjectiles.splice(i, 1);
        }
    }
}

function findShipAtPoint(pointXY, excludeTeam) {
    let found = null;
    forEachShip((ship, teamId) => {
        if (found) return;
        if (parseInt(teamId) === excludeTeam) return;
        if (pointInShip(pointXY, ship)) found = ship;
    });
    return found;
}



function pointInShip(pointXY, ship) {
    let template = SHIP_TEMPLATES[ship.shipType];
    let halfBeam = template.beam / 2;
    let halfLength = template.length / 2;

    //transform point to ship-local coordinates
    let dx = pointXY[0] - ship.positionXY[0];
    let dy = pointXY[1] - ship.positionXY[1];

    let cos = ship.orientationDir[0];
    let sin = ship.orientationDir[1];

    //inverse rotation to get local coords
    let localX = dx * (-sin) + dy * cos; //perpendicular to ship
    let localY = dx * cos + dy * sin; //along ship length

    //simple rectangle check for now (pointed bow comes in rendering)
    return Math.abs(localX) < halfBeam && Math.abs(localY) < halfLength;
}

//find which ship (if any) is under a world point, returns {ship, teamId, factionId} or null
function getShipAtPoint(pointXY) {
    let result = null;
    forEachShip((ship, teamId, factionId) => {
        if (result) return;
        if (pointInShip(pointXY, ship)) {
            result = {ship, teamId, factionId};
        }
    });
    return result;
}

//find which hitpoint on a ship is under a world point (within hitpoint radius)
function getHitpointAtPoint(pointXY, ship) {
    let hitpointRadius = 15; //meters, clickable radius for hitpoints
    let closest = null;
    let closestDist = hitpointRadius;

    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        let hpWorldXY = getHitpointWorldPos(ship, hp);
        let d = dist(pointXY, hpWorldXY);
        if (d < closestDist) {
            closestDist = d;
            closest = {name: hpName, hp: hp};
        }
    }
    return closest;
}

//update what ship/hitpoint the mouse is hovering over
function updateHover() {
    input.hoveredShip = null;
    input.hoveredHitpoint = null;

    let result = getShipAtPoint(input.mouseWorldXY);
    if (result) {
        input.hoveredShip = result.ship;
        //check if hovering over a specific hitpoint
        let hpResult = getHitpointAtPoint(input.mouseWorldXY, result.ship);
        if (hpResult) {
            input.hoveredHitpoint = hpResult;
        }
    }
}

function applyDamageToShip(ship, damage, impactXY) {
    //find closest hitpoint to impact, apply damage to it
    //AA hitpoints get 2x distance multiplier (harder to hit)
    let closestHp = null;
    let closestDist = Infinity;

    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        if (hp.destroyed) continue;

        let hpWorldXY = getHitpointWorldPos(ship, hp);
        let d = dist(impactXY, hpWorldXY);

        //AA multiplier makes them effectively further away for damage assignment
        if (hp.type === 'AA') d *= 2;

        if (d < closestDist) {
            closestDist = d;
            closestHp = hp;
        }
    }

    if (closestHp) {
        closestHp.health -= damage;
        if (closestHp.health <= 0) {
            closestHp.health = 0;
            closestHp.destroyed = true;
        }

        //update ship total health
        ship.health = 0;
        for (let hpName in ship.hitpoints) {
            ship.health += ship.hitpoints[hpName].health;
        }
    }
}

// === VFX ===

function spawnVFX(type, positionXY) {
    game.activeVFX.push({
        type: type,
        positionXY: [...positionXY],
        age: 0,
        maxAge: type === 'hit' ? 1 : 2 //hit explosions shorter than splashes
    });
}

function updateVFX(dt) {
    for (let i = game.activeVFX.length - 1; i >= 0; i--) {
        game.activeVFX[i].age += dt;
        if (game.activeVFX[i].age >= game.activeVFX[i].maxAge) {
            game.activeVFX.splice(i, 1);
        }
    }
}

// === PRUNE DEAD ===

function pruneDeadAgents() {
    for (let teamId in game.activeAgents) {
        for (let factionId in game.activeAgents[teamId]) {
            let ships = game.activeAgents[teamId][factionId].ships;
            for (let i = ships.length - 1; i >= 0; i--) {
                if (ships[i].health <= 0) {
                    //deselect if selected
                    let idx = input.selectedAgents.indexOf(ships[i]);
                    if (idx !== -1) input.selectedAgents.splice(idx, 1);

                    spawnVFX('hit', ships[i].positionXY); //death explosion
                    ships.splice(i, 1);
                }
            }
        }
    }
}

// === RENDERING ===

function render() {
    //clear with sea color
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (game.phase !== 'playing') return;

    //render ships
    forEachShip((ship, teamId, factionId) => {
        renderShip(ship, teamId, factionId);
    });

    //render projectiles
    for (let proj of game.activeProjectiles) {
        renderProjectile(proj);
    }

    //render VFX
    for (let vfx of game.activeVFX) {
        renderVFX(vfx);
    }

    //render selection box if dragging
    if (input.isDragging && input.dragStartXY && input.dragEndXY) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        let x = Math.min(input.dragStartXY[0], input.dragEndXY[0]);
        let y = Math.min(input.dragStartXY[1], input.dragEndXY[1]);
        let w = Math.abs(input.dragEndXY[0] - input.dragStartXY[0]);
        let h = Math.abs(input.dragEndXY[1] - input.dragStartXY[1]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }
}

function renderShip(ship, teamId, factionId) {
    let template = SHIP_TEMPLATES[ship.shipType];
    let screenXY = worldToScreen(ship.positionXY[0], ship.positionXY[1]);

    //scale dimensions by zoom
    let screenBeam = template.beam / camera.zoom;
    let screenLength = template.length / camera.zoom;

    //get faction color
    let faction = game.teams[teamId]?.factions[factionId];
    let color = faction?.color || '#888888';

    ctx.save();
    ctx.translate(screenXY[0], screenXY[1]);

    //rotate so ship points in orientationDir
    //orientationDir [1,0] means pointing right, we draw ship with bow pointing up by default
    let angle = Math.atan2(ship.orientationDir[1], ship.orientationDir[0]);
    ctx.rotate(angle + Math.PI / 2); //+90deg so [1,0] dir means bow points right

    //draw ship hull - rectangle with pointed bow
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -screenLength / 2); //bow point
    ctx.lineTo(screenBeam / 2, -screenLength / 2 + screenLength * 0.15); //bow right
    ctx.lineTo(screenBeam / 2, screenLength / 2); //stern right
    ctx.lineTo(-screenBeam / 2, screenLength / 2); //stern left
    ctx.lineTo(-screenBeam / 2, -screenLength / 2 + screenLength * 0.15); //bow left
    ctx.closePath();
    ctx.fill();

    //outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    let isSelected = input.selectedAgents.includes(ship);
    let isHovered = input.hoveredShip === ship;
    let showDetails = isSelected || isHovered;

    //selection ring
    if (isSelected) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenXY[0], screenXY[1], Math.max(screenBeam, screenLength) / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    //health bar (show for selected or hovered ships)
    if (showDetails) {
        let barW = 50;
        let barH = 6;
        let barX = screenXY[0] - barW / 2;
        let barY = screenXY[1] - screenLength / 2 - 15;
        let healthPct = ship.health / ship.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        //green > 60%, yellow 30-60%, red < 30%
        ctx.fillStyle = healthPct > 0.6 ? '#0f0' : (healthPct > 0.3 ? '#ff0' : '#f00');
        ctx.fillRect(barX, barY, barW * healthPct, barH);

        //render hitpoints
        renderShipHitpoints(ship, isHovered);
    }
}

function renderShipHitpoints(ship, showHealthBars) {
    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        let hpWorldXY = getHitpointWorldPos(ship, hp);
        let hpScreenXY = worldToScreen(hpWorldXY[0], hpWorldXY[1]);

        let hpRadius = 6; //screen pixels for hitpoint marker

        //color by type
        let baseColor;
        if (hp.destroyed) {
            baseColor = '#333';
        } else if (hp.type === 'in18') {
            baseColor = '#ff3300'; //big guns = red-orange
        } else if (hp.type === 'in13') {
            baseColor = '#ff6600';
        } else if (hp.type === 'in9') {
            baseColor = '#ff9900';
        } else if (hp.type === 'in6') {
            baseColor = '#ffcc00';
        } else if (hp.type === 'AA') {
            baseColor = '#00aaff';
        } else if (hp.type === 'torpedoMount') {
            baseColor = '#00ff88';
        } else if (hp.type === 'hangarBay') {
            baseColor = '#aa00ff';
        } else {
            baseColor = '#888';
        }

        //draw hitpoint circle
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(hpScreenXY[0], hpScreenXY[1], hpRadius, 0, Math.PI * 2);
        ctx.fill();

        //highlight if this is the hovered hitpoint
        if (input.hoveredHitpoint && input.hoveredHitpoint.name === hpName && input.hoveredShip === ship) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hpScreenXY[0], hpScreenXY[1], hpRadius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        //mini health bar for hitpoint
        if (showHealthBars && !hp.destroyed) {
            let barW = 20;
            let barH = 3;
            let barX = hpScreenXY[0] - barW / 2;
            let barY = hpScreenXY[1] - hpRadius - 6;
            let hpPct = hp.health / hp.maxHealth;

            ctx.fillStyle = '#222';
            ctx.fillRect(barX, barY, barW, barH);
            //green > 60%, yellow 30-60%, red < 30%
            ctx.fillStyle = hpPct > 0.6 ? '#0f0' : (hpPct > 0.3 ? '#ff0' : '#f00');
            ctx.fillRect(barX, barY, barW * hpPct, barH);
        }
    }
}

function renderProjectile(proj) {
    let screenXY = worldToScreen(proj.positionXY[0], proj.positionXY[1]);
    let size = proj.type === 'mainCannon' ? 5 : 3;
    let tailLength = size * 2.5; //teardrop tail

    //calculate angle from velocity
    let angle = Math.atan2(proj.velocityXY[1], proj.velocityXY[0]);

    ctx.save();
    ctx.translate(screenXY[0], screenXY[1]);
    ctx.rotate(angle);

    //draw teardrop: circle at front, pointed tail behind
    //front is in direction of travel (+x after rotation)
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    //front circle
    ctx.arc(0, 0, size, -Math.PI/2, Math.PI/2);
    //tail going backwards (-x direction)
    ctx.lineTo(-tailLength, 0);
    ctx.closePath();
    ctx.fill();

    //bright hot core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function renderVFX(vfx) {
    let screenXY = worldToScreen(vfx.positionXY[0], vfx.positionXY[1]);
    let alpha = 1 - (vfx.age / vfx.maxAge);
    let size = vfx.type === 'hit' ? 20 : 15;
    size = size * (1 + vfx.age * 0.5); //expand over time

    ctx.globalAlpha = alpha;
    ctx.fillStyle = vfx.type === 'hit' ? '#ff8800' : '#88ccff';
    ctx.beginPath();
    ctx.arc(screenXY[0], screenXY[1], size / camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// === INPUT HANDLING ===

canvas.addEventListener('mousedown', e => {
    if (game.phase !== 'playing') return;

    if (e.button === 0) { //left click
        input.isDragging = true;
        input.dragStartXY = [e.offsetX, e.offsetY];
        input.dragEndXY = [...input.dragStartXY];
    }
});

canvas.addEventListener('mousemove', e => {
    input.mouseScreenXY = [e.offsetX, e.offsetY];
    input.mouseWorldXY = screenToWorld(e.offsetX, e.offsetY);

    if (input.isDragging) {
        input.dragEndXY = [e.offsetX, e.offsetY];
    }
});

canvas.addEventListener('mouseup', e => {
    if (game.phase !== 'playing') return;

    if (e.button === 0 && input.isDragging) { //left click release
        input.isDragging = false;

        let startWorld = screenToWorld(input.dragStartXY[0], input.dragStartXY[1]);
        let endWorld = screenToWorld(input.dragEndXY[0], input.dragEndXY[1]);

        let dragDist = dist(input.dragStartXY, input.dragEndXY);

        if (dragDist < 5) {
            //click select
            selectAtPoint(startWorld);
        } else {
            //box select
            selectInRect(startWorld, endWorld);
        }
    }

    if (e.button === 2) { //right click - move/target command
        let worldXY = screenToWorld(e.offsetX, e.offsetY);

        //check if clicking on an enemy ship
        let clickedResult = getShipAtPoint(worldXY);
        if (clickedResult && parseInt(clickedResult.teamId) !== localPlayer.team) {
            //targeting an enemy ship
            let enemyShip = clickedResult.ship;

            //check if clicking on a specific hitpoint
            let hpResult = getHitpointAtPoint(worldXY, enemyShip);

            for (let ship of input.selectedAgents) {
                if (hpResult) {
                    //target specific hitpoint
                    ship.targetMode = 'hitpoint';
                    ship.lockedTarget = enemyShip;
                    ship.lockedHitpoint = hpResult.name;
                } else {
                    //target whole ship
                    ship.targetMode = 'agent';
                    ship.lockedTarget = enemyShip;
                    ship.lockedHitpoint = null;
                }
                //also move toward target
                ship.targetPositionXY = [...enemyShip.positionXY];
            }
        } else {
            //move command (clear targeting)
            for (let ship of input.selectedAgents) {
                ship.targetPositionXY = [...worldXY];
                ship.targetMode = 'auto';
                ship.lockedTarget = null;
                ship.lockedHitpoint = null;
            }
        }
    }
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();

    let mouseWorld = screenToWorld(e.offsetX, e.offsetY);

    camera.zoom *= e.deltaY > 0 ? 1.1 : 0.9;
    camera.zoom = clamp(camera.zoom, camera.minZoom, camera.maxZoom);

    //adjust camera so mouse stays over same world point
    let mouseWorldAfter = screenToWorld(e.offsetX, e.offsetY);
    camera.x += mouseWorld[0] - mouseWorldAfter[0];
    camera.y += mouseWorld[1] - mouseWorldAfter[1];
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
    if (e.key === 'Shift') input.shiftHeld = true;
    if (e.key === 'Escape') input.selectedAgents = [];
    if (e.key === ' ' && game.phase === 'playing') {
        game.isPaused = !game.isPaused;
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'Shift') input.shiftHeld = false;
});

function selectAtPoint(worldXY) {
    if (!input.shiftHeld) input.selectedAgents = [];

    //find ship under click (only own faction)
    forEachShip((ship, teamId, factionId) => {
        if (parseInt(teamId) !== localPlayer.team) return;
        if (factionId !== localPlayer.faction) return;

        if (pointInShip(worldXY, ship)) {
            let idx = input.selectedAgents.indexOf(ship);
            if (idx === -1) {
                input.selectedAgents.push(ship);
            } else if (input.shiftHeld) {
                input.selectedAgents.splice(idx, 1); //toggle off
            }
        }
    });
}

function selectInRect(startWorld, endWorld) {
    if (!input.shiftHeld) input.selectedAgents = [];

    let minX = Math.min(startWorld[0], endWorld[0]);
    let maxX = Math.max(startWorld[0], endWorld[0]);
    let minY = Math.min(startWorld[1], endWorld[1]);
    let maxY = Math.max(startWorld[1], endWorld[1]);

    forEachShip((ship, teamId, factionId) => {
        if (parseInt(teamId) !== localPlayer.team) return;
        if (factionId !== localPlayer.faction) return;

        let x = ship.positionXY[0];
        let y = ship.positionXY[1];

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            if (!input.selectedAgents.includes(ship)) {
                input.selectedAgents.push(ship);
            }
        }
    });
}

// === INITIALIZATION ===

window.onload = function() {
    if (loadPlayerIdentity()) {
        document.getElementById('loginPopup').classList.add('hidden');
        game.phase = 'menu';
        showMenu();
    }
    //else login popup is already visible
};




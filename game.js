// === CONSTANTS ===

//hitpoint type definitions - used as templates when creating actual hitpoints on ships
const HITPOINT_TYPES = {
    mainCannon: {
        range: 42000, //42km in meters
        damage: 150, //placeholder, needs tuning based on KE calcs later
        maxHealth: 700,
        maxCooldown: 20, //seconds between shots
        projectileSpeed: 820 //m/s
    },
    secondaryCannon: {
        range: 15000,
        damage: 40,
        maxHealth: 100,
        maxCooldown: 4,
        projectileSpeed: 790
    },
    AA: {
        range: 6000,
        damage: 8, //per stream burst
        maxHealth: 60, //lower health, but harder to hit (2x distance multiplier in damage calc)
        maxCooldown: 0.2,
        projectileSpeed: 880
    },
    hangarBay: { //for carriers, higher health than cannons
        range: 0,
        damage: 0,
        maxHealth: 400,
        maxCooldown: 0,
        projectileSpeed: 0
    }
};

//merged ship templates - beam/length in meters, speeds in m/s
const SHIP_TEMPLATES = {
    destroyer: {
        beam: 12, length: 115,
        maxSpeed: 18, //m/s, roughly 35 knots
        acceleration: 2, //m/s^2
        turnRate: 0.04, //radians/sec
        hitpoints: [
            {name: 'mainCannon1', type: 'mainCannon', relPosXY: [0, -40]},
            {name: 'mainCannon2', type: 'mainCannon', relPosXY: [0, 40]},
            {name: 'AA1', type: 'AA', relPosXY: [5, 0]},
            {name: 'AA2', type: 'AA', relPosXY: [-5, 0]}
        ]
    },
    lightCruiser: {
        beam: 20, length: 183,
        maxSpeed: 16,
        acceleration: 1.5,
        turnRate: 0.035,
        hitpoints: [
            {name: 'mainCannon1', type: 'mainCannon', relPosXY: [0, -70]},
            {name: 'mainCannon2', type: 'mainCannon', relPosXY: [0, -30]},
            {name: 'mainCannon3', type: 'mainCannon', relPosXY: [0, 50]},
            {name: 'secondaryCannon1', type: 'secondaryCannon', relPosXY: [8, 10]},
            {name: 'secondaryCannon2', type: 'secondaryCannon', relPosXY: [-8, 10]},
            {name: 'AA1', type: 'AA', relPosXY: [8, -10]},
            {name: 'AA2', type: 'AA', relPosXY: [-8, -10]}
        ]
    },
    heavyCruiser: {
        beam: 22, length: 204,
        maxSpeed: 15,
        acceleration: 1.2,
        turnRate: 0.03,
        hitpoints: [
            {name: 'mainCannon1', type: 'mainCannon', relPosXY: [0, -80]},
            {name: 'mainCannon2', type: 'mainCannon', relPosXY: [0, -40]},
            {name: 'mainCannon3', type: 'mainCannon', relPosXY: [0, 60]},
            {name: 'secondaryCannon1', type: 'secondaryCannon', relPosXY: [10, 0]},
            {name: 'secondaryCannon2', type: 'secondaryCannon', relPosXY: [-10, 0]},
            {name: 'secondaryCannon3', type: 'secondaryCannon', relPosXY: [10, 30]},
            {name: 'secondaryCannon4', type: 'secondaryCannon', relPosXY: [-10, 30]},
            {name: 'AA1', type: 'AA', relPosXY: [9, -20]},
            {name: 'AA2', type: 'AA', relPosXY: [-9, -20]},
            {name: 'AA3', type: 'AA', relPosXY: [9, 20]},
            {name: 'AA4', type: 'AA', relPosXY: [-9, 20]}
        ]
    },
    battlecruiser: {
        beam: 30, length: 231,
        maxSpeed: 14,
        acceleration: 1.0,
        turnRate: 0.025,
        hitpoints: [
            {name: 'mainCannon1', type: 'mainCannon', relPosXY: [0, -90]},
            {name: 'mainCannon2', type: 'mainCannon', relPosXY: [0, -50]},
            {name: 'mainCannon3', type: 'mainCannon', relPosXY: [0, 50]},
            {name: 'mainCannon4', type: 'mainCannon', relPosXY: [0, 80]},
            {name: 'secondaryCannon1', type: 'secondaryCannon', relPosXY: [12, -20]},
            {name: 'secondaryCannon2', type: 'secondaryCannon', relPosXY: [-12, -20]},
            {name: 'secondaryCannon3', type: 'secondaryCannon', relPosXY: [12, 20]},
            {name: 'secondaryCannon4', type: 'secondaryCannon', relPosXY: [-12, 20]},
            {name: 'AA1', type: 'AA', relPosXY: [12, -40]},
            {name: 'AA2', type: 'AA', relPosXY: [-12, -40]},
            {name: 'AA3', type: 'AA', relPosXY: [12, 40]},
            {name: 'AA4', type: 'AA', relPosXY: [-12, 40]}
        ]
    },
    battleship: {
        beam: 36, length: 267,
        maxSpeed: 12,
        acceleration: 0.8,
        turnRate: 0.02,
        hitpoints: [
            {name: 'mainCannon1', type: 'mainCannon', relPosXY: [0, -100]},
            {name: 'mainCannon2', type: 'mainCannon', relPosXY: [0, -60]},
            {name: 'mainCannon3', type: 'mainCannon', relPosXY: [0, 60]},
            {name: 'mainCannon4', type: 'mainCannon', relPosXY: [0, 90]},
            {name: 'secondaryCannon1', type: 'secondaryCannon', relPosXY: [15, -30]},
            {name: 'secondaryCannon2', type: 'secondaryCannon', relPosXY: [-15, -30]},
            {name: 'secondaryCannon3', type: 'secondaryCannon', relPosXY: [15, 0]},
            {name: 'secondaryCannon4', type: 'secondaryCannon', relPosXY: [-15, 0]},
            {name: 'secondaryCannon5', type: 'secondaryCannon', relPosXY: [15, 30]},
            {name: 'secondaryCannon6', type: 'secondaryCannon', relPosXY: [-15, 30]},
            {name: 'AA1', type: 'AA', relPosXY: [14, -50]},
            {name: 'AA2', type: 'AA', relPosXY: [-14, -50]},
            {name: 'AA3', type: 'AA', relPosXY: [14, -20]},
            {name: 'AA4', type: 'AA', relPosXY: [-14, -20]},
            {name: 'AA5', type: 'AA', relPosXY: [14, 20]},
            {name: 'AA6', type: 'AA', relPosXY: [-14, 20]}
        ]
    },
    carrier: {
        beam: 45, length: 266, //flight deck width counted as beam for simplicity
        maxSpeed: 13,
        acceleration: 0.9,
        turnRate: 0.022,
        hitpoints: [
            {name: 'hangarBay1', type: 'hangarBay', relPosXY: [0, -40]},
            {name: 'hangarBay2', type: 'hangarBay', relPosXY: [0, 40]},
            {name: 'AA1', type: 'AA', relPosXY: [18, -80]},
            {name: 'AA2', type: 'AA', relPosXY: [-18, -80]},
            {name: 'AA3', type: 'AA', relPosXY: [18, 0]},
            {name: 'AA4', type: 'AA', relPosXY: [-18, 0]},
            {name: 'AA5', type: 'AA', relPosXY: [18, 80]},
            {name: 'AA6', type: 'AA', relPosXY: [-18, 80]}
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
const PRIORITY = {
    mainCannon: {battleship: 1, carrier: 2, battlecruiser: 3, heavyCruiser: 4, lightCruiser: 5, destroyer: 6},
    secondaryCannon: {heavyCruiser: 1, lightCruiser: 2, destroyer: 3, battlecruiser: 4, battleship: 5, carrier: 6}
    //AA uses distance-based priority, not this matrix
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
    shiftHeld: false
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
        startGame();
    }
}

function onGamemodeChange() {
    game.currentGamemode = document.getElementById('gamemodeSelect').value;
    setAllPlayersNotReady();
}

// === AGENT CREATION ===

function createShip(teamId, factionId, shipType, positionXY, orientationDir) {
    let template = SHIP_TEMPLATES[shipType];
    if (!template) return null;

    //initialize hitpoints from template
    let hitpoints = {};
    let totalHealth = 0;
    for (let hpDef of template.hitpoints) {
        let hpType = HITPOINT_TYPES[hpDef.type];
        hitpoints[hpDef.name] = {
            type: hpDef.type,
            relPosXY: [...hpDef.relPosXY],
            health: hpType.maxHealth,
            maxHealth: hpType.maxHealth,
            cooldown: 0,
            destroyed: false
        };
        totalHealth += hpType.maxHealth;
    }

    return {
        id: randomId(),
        team: parseInt(teamId),
        faction: factionId,
        shipType: shipType,
        positionXY: [...positionXY],
        orientationDir: normalize(orientationDir), //always normalized unit vector
        currentSpeed: 0,
        targetPositionXY: null,
        targetMode: 'auto', //'auto', 'agent', 'hitpoint'
        lockedTarget: null,
        lockedHitpoint: null,
        hitpoints: hitpoints,
        health: totalHealth,
        maxHealth: totalHealth
    };
}

function spawnSupremacyFleet(teamId, factionId, centerXY, facingDir) {
    let ships = GAMEMODES.supremacy.spawnShips;
    let spacing = 400; //meters between ships
    let agents = [];

    //arrange ships in a line perpendicular to facing direction
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

// === GAME START ===

function startGame() {
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

    //spawn fleets based on gamemode
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

            let ships = spawnSupremacyFleet(teamId, factionId, factionCenter, pos.facing);
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
        targetAndFire(dt);
        updateProjectiles(dt);
        updateMovement(dt);
        updateVFX(dt);
        pruneDeadAgents();
        game.time += dt;
    }

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

function targetAndFire(dt) {
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
        }
        //TODO: 'agent' and 'hitpoint' target modes
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
    let cos = ship.orientationDir[0];
    let sin = ship.orientationDir[1];
    let relX = hp.relPosXY[0];
    let relY = hp.relPosXY[1];

    //rotate relative position by orientation
    //note: relY is along ship length (forward is positive Y in local space)
    //ship.orientationDir points in the direction the ship is facing
    return [
        ship.positionXY[0] + relX * (-sin) + relY * cos,
        ship.positionXY[1] + relX * cos + relY * sin
    ];
}

function fireAtShip(shooter, hp, target) {
    let hpWorldXY = getHitpointWorldPos(shooter, shooter.hitpoints[Object.keys(shooter.hitpoints).find(k => shooter.hitpoints[k] === hp)] || hp);
    //fix: get proper hp reference
    for (let hpName in shooter.hitpoints) {
        if (shooter.hitpoints[hpName] === hp) {
            hpWorldXY = getHitpointWorldPos(shooter, shooter.hitpoints[hpName]);
            break;
        }
    }

    let projSpeed = HITPOINT_TYPES[hp.type].projectileSpeed;

    //lead targeting: predict where target will be
    let d = dist(hpWorldXY, target.positionXY);
    let timeToHit = d / projSpeed;

    let targetVelXY = [
        target.orientationDir[0] * target.currentSpeed,
        target.orientationDir[1] * target.currentSpeed
    ];
    let aimPointXY = [
        target.positionXY[0] + targetVelXY[0] * timeToHit,
        target.positionXY[1] + targetVelXY[1] * timeToHit
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
        targetShip: target //reference for potential tracking, though shells don't track
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

    //selection ring
    if (input.selectedAgents.includes(ship)) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenXY[0], screenXY[1], Math.max(screenBeam, screenLength) / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();

        //health bar
        let barW = 50;
        let barH = 6;
        let barX = screenXY[0] - barW / 2;
        let barY = screenXY[1] - screenLength / 2 - 15;
        let healthPct = ship.health / ship.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = healthPct > 0.3 ? '#0f0' : '#f00';
        ctx.fillRect(barX, barY, barW * healthPct, barH);
    }
}

function renderProjectile(proj) {
    let screenXY = worldToScreen(proj.positionXY[0], proj.positionXY[1]);
    let size = proj.type === 'mainCannon' ? 4 : 2;

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(screenXY[0], screenXY[1], size, 0, Math.PI * 2);
    ctx.fill();
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

    if (e.button === 2) { //right click - move command
        let worldXY = screenToWorld(e.offsetX, e.offsetY);
        for (let ship of input.selectedAgents) {
            ship.targetPositionXY = [...worldXY];
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

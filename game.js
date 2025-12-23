// === CONSTANTS ===

const images = {};
async function loadAllImages() {
    const load = src => new Promise((res, rej) => {
        let img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(src);
        img.src = src;
    });
    images.fighter = await load('assets/fighterPlane.png');
    images.bomber = await load('assets/bomberPlane.png');
    images.torpedo = await load('assets/torpedoPlane.png');
}

//turret radii for visual rendering (screen pixels at zoom=1)
const TURRET_RADII = {in18: 8, in13: 7, in9: 6, in6: 5, torpedoMount: 4, hangarBay: 0};

//superstructure configs per ship type {y: center offset, w: width, h: height}
const SUPERSTRUCTURES = {
    destroyer: [{y: -10, w: 6, h: 15}],
    lightCruiser: [{y: -30, w: 8, h: 20}, {y: 10, w: 6, h: 12}],
    heavyCruiser: [{y: -30, w: 10, h: 25}, {y: 15, w: 8, h: 18}],
    battlecruiser: [{y: -35, w: 12, h: 30}, {y: 20, w: 10, h: 22}],
    battleship: [{y: -40, w: 14, h: 35}, {y: 25, w: 12, h: 28}, {y: 60, w: 8, h: 15}],
    carrier: [{y: -80, w: 10, h: 20}] //bridge only, positioned on side
};

//sun direction for shadows (normalized, pointing toward light source)
const SUN_DIR = [0.53, -0.85]; //pre-normalized

// === AUDIO SYSTEM ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

//sound definitions
const SOUND_DEFS = {
    cannonIn18: {freq: 60, dur: 0.6, type: 'cannon', vol: 1.0},
    cannonIn13: {freq: 80, dur: 0.5, type: 'cannon', vol: 0.85},
    cannonIn9: {freq: 100, dur: 0.4, type: 'cannon', vol: 0.7},
    cannonIn6: {freq: 140, dur: 0.3, type: 'cannon', vol: 0.5},
    AA: {freq: 800, dur: 0.08, type: 'aa', vol: 0.25},
    hit: {freq: 120, dur: 0.3, type: 'cannon', vol: 0.7},
    splash: {freq: 400, dur: 0.4, type: 'splash', vol: 0.25},
    select: {freq: 800, dur: 0.08, type: 'click', vol: 0.1}
};

function playSound(soundName, worldXY) {
    let def = SOUND_DEFS[soundName];
    if (!def) return;
    let d = Math.hypot(worldXY[0] - camera.x, worldXY[1] - camera.y);
    let falloff = 1 / (1 + (d / 8000) ** 2);
    let vol = def.vol * falloff * 0.25;
    if (vol < 0.005) return;

    let t = audioCtx.currentTime;

    if (def.type === 'cannon') {
        //deep boom using noise + low freq oscillator
        let bufferSize = audioCtx.sampleRate * def.dur;
        let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let env = Math.exp(-i / (bufferSize * 0.15));
            data[i] = (Math.random() * 2 - 1) * env;
        }
        let noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = def.freq * 2;
        let gain = audioCtx.createGain();
        gain.gain.value = vol;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(t);
    } else if (def.type === 'aa') {
        //sharp crack
        let bufferSize = audioCtx.sampleRate * def.dur;
        let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let env = Math.exp(-i / (bufferSize * 0.3));
            data[i] = (Math.random() * 2 - 1) * env;
        }
        let noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 600;
        let gain = audioCtx.createGain();
        gain.gain.value = vol;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(t);
    } else if (def.type === 'splash') {
        let bufferSize = audioCtx.sampleRate * def.dur;
        let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let env = Math.sin(Math.PI * i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * env;
        }
        let noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500;
        filter.Q.value = 0.5;
        let gain = audioCtx.createGain();
        gain.gain.value = vol;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(t);
    } else if (def.type === 'click') {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = def.freq;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + def.dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + def.dur);
    }
}

//sea ambience (continuous low rumble)
let seaAmbience = null;
function startSeaAmbience() {
    if (seaAmbience) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    let filter = audioCtx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = 30;
    filter.type = 'lowpass';
    filter.frequency.value = 100;
    gain.gain.value = 0.03;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    seaAmbience = {osc, gain};
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
        //carrier has squadron storage - defined here as default loadout
        squadrons: [
            {type: 'fighterSquadron', count: 6}, //6 fighter squadrons (12 planes each)
            {type: 'torpedoSquadron', count: 3}  //3 torpedo squadrons (5 planes each)
        ],
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

//aircraft templates - V formation settings: stepX = horizontal spacing, stepY = vertical offset
const AIRCRAFT_TEMPLATES = {
    fighterSquadron: {
        maxHealth: 24, maxSpeed: 150, turnRate: 0.3, squadSize: 12, healthPerUnit: 2,
        dogfightDPS: 3, bombDamage: 20, bombCapacity: 2, image: 'fighter',
        formationStepX: 20, formationStepY: 6, //shallow V formation
        defaultArmed: false //fighters unarmed by default, can equip bombs
    },
    torpedoSquadron: {
        maxHealth: 10, maxSpeed: 120, turnRate: 0.2, squadSize: 5, healthPerUnit: 2,
        dogfightDPS: 0.5, torpedoDamage: 300, torpedoCapacity: 1, image: 'torpedo',
        formationStepX: 25, formationStepY: 8, defaultArmed: true
    },
    heavyBomberSquadron: {
        maxHealth: 50, maxSpeed: 90, turnRate: 0.1, squadSize: 5, healthPerUnit: 10,
        dogfightDPS: 0.3, bombDamage: 150, bombCapacity: 6, image: 'bomber',
        formationStepX: 30, formationStepY: 10, defaultArmed: true
    }
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
    rotation: 0, //view rotation in radians
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
    hoveredShip: null,
    hoveredHitpoint: null,
    //middle mouse pan/rotate
    middleDragging: false,
    middleStartXY: null
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
    //translate from screen center
    let dx = (sx - canvas.width/2) * camera.zoom;
    let dy = (sy - canvas.height/2) * camera.zoom;
    //unrotate (negative angle)
    let cos = Math.cos(-camera.rotation), sin = Math.sin(-camera.rotation);
    let rx = dx * cos - dy * sin;
    let ry = dx * sin + dy * cos;
    return [rx + camera.x, ry + camera.y];
}

function worldToScreen(wx, wy) {
    //translate relative to camera
    let dx = wx - camera.x, dy = wy - camera.y;
    //rotate
    let cos = Math.cos(camera.rotation), sin = Math.sin(camera.rotation);
    let rx = dx * cos - dy * sin;
    let ry = dx * sin + dy * cos;
    //scale and translate to screen center
    return [rx / camera.zoom + canvas.width/2, ry / camera.zoom + canvas.height/2];
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
    constructor(teamId, factionId, shipType, positionXY, orientationDir, hitpoints, totalHealth){
        super(teamId, positionXY, orientationDir, shipType);
        this.faction = factionId;
        this.shipType = shipType;
        this.positionXY = [...positionXY];
        this.orientationDir = normalize(orientationDir);
        this.currentSpeed = 0;
        this.targetPositionXY = null;
        this.targetMode = 'auto'; //'auto', 'agent', 'hitpoint'
        this.lockedTarget = null;
        this.lockedHitpoint = null;
        this.hitpoints = hitpoints;
        this.health = totalHealth;
        this.maxHealth = totalHealth;
        //ordnance tracking - count torpedoes per torpedo mount
        this.torpedoCount = this.countTorpedoMounts() * 4; //4 torpedoes per mount
        //carrier squadron storage
        if (shipType === 'carrier') {
            let tpl = SHIP_TEMPLATES.carrier;
            this.storedSquadrons = tpl.squadrons.map(s => ({type: s.type, count: s.count}));
            this.launchingSquadron = null; //squadron currently launching
            this.launchProgress = 0;
        }
    }
    countTorpedoMounts() {
        let count = 0;
        for (let name in this.hitpoints) {
            if (this.hitpoints[name].type === 'torpedoMount' && !this.hitpoints[name].destroyed) count++;
        }
        return count;
    }
}

class Aircraft extends Agent{
    constructor(teamId, factionId, aircraftType, positionXYZ, orientationDir, totalHealth, homeCarrier){
        super(teamId, positionXYZ, orientationDir, aircraftType);
        this.faction = factionId;
        this.aircraftType = aircraftType;
        this.positionXYZ = [...positionXYZ];
        this.positionXY = [positionXYZ[0], positionXYZ[1]];
        this.orientationDir = normalize(orientationDir);
        this.currentSpeed = AIRCRAFT_TEMPLATES[aircraftType].maxSpeed * 0.8;
        this.targetPositionXY = null;
        this.health = totalHealth;
        this.maxHealth = totalHealth;
        //squadron state
        let t = AIRCRAFT_TEMPLATES[aircraftType];
        this.state = 'idle'; //'idle','moving','dogfight','bombing','returning','launching'
        this.flightTime = 0;
        this.armed = t.defaultArmed; //fighters default unarmed
        this.bombs = this.armed ? (t.bombCapacity || 0) : 0;
        this.torpedoes = t.torpedoCapacity || 0;
        this.dogfightTarget = null;
        this.bombTarget = null;
        this.homeCarrier = homeCarrier || null;
        this.unitsAlive = t.squadSize;
        this.launchProgress = 0; //for takeoff animation
    }
    get fatigueMultiplier() {
        return this.flightTime < 60 ? 1 : Math.max(0.5, 1 - (this.flightTime - 60) * 0.0005);
    }
}

//bases are just collections of hitpoints on land.

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

    return new Ship(teamId, factionId, shipType, positionXY, orientationDir, hitpoints, totalHealth);
}

//orientationDir should usually just be the same as, say, the aircraft carrier's facing direction, or the base's airstrip facing direction.
function createAircraft(teamId, factionId, aircraftType, positionXYZ, orientationDir) {
    let template = AIRCRAFT_TEMPLATES[aircraftType];
    return new Aircraft(teamId, factionId, aircraftType, positionXYZ, orientationDir, template.maxHealth);
}

//starter formation for supremacy - carrier-centered fleet
//ship types must match SHIP_TEMPLATES keys (camelCase)
const formationSupremacyStarter = {
    formationOrientation: [0, -1],
    shipFormation: [
        {type: 'carrier', position: [0, 0], orientation: [0, -1]},
        {type: 'battleship', position: [-500, -80], orientation: [0, -1]},
        {type: 'battlecruiser', position: [500, -80], orientation: [0, -1]},
        {type: 'heavyCruiser', position: [-500, -580], orientation: [0, -1]},
        {type: 'heavyCruiser', position: [500, -580], orientation: [0, -1]},
        {type: 'lightCruiser', position: [-500, -1080], orientation: [0, -1]},
        {type: 'lightCruiser', position: [500, -1080], orientation: [0, -1]},
        {type: 'destroyer', position: [-500, 420], orientation: [0, -1]},
        {type: 'destroyer', position: [500, 420], orientation: [0, -1]},
        {type: 'destroyer', position: [0, -1580], orientation: [0, -1]}
    ],
    aircraftFormation: [] //aircraft not yet implemented
};

//spawn positions for supremacy mode - map is 50km x 50km (0-50000 coords)
//each entry: {position: [x,y], orientation: [dx,dy]} facing toward center
const SPAWN_POSITIONS_SUPREMACY = {
    //2 factions: top vs bottom
    2: [
        {position: [25000, 20000], orientation: [0, 1]},   //top, faces down
        {position: [25000, 30000], orientation: [0, -1]}   //bottom, faces up
    ],
    //4 factions: one per cardinal direction
    4: [
        {position: [25000, 10000], orientation: [0, 1]},   //top
        {position: [25000, 40000], orientation: [0, -1]},  //bottom
        {position: [10000, 25000], orientation: [1, 0]},   //left
        {position: [40000, 25000], orientation: [-1, 0]}   //right
    ],
    //8 factions: 2 per side (for 2v2, 4v4, etc)
    8: [
        {position: [21000, 10000], orientation: [0, 1]},   //top-left
        {position: [29000, 10000], orientation: [0, 1]},   //top-right
        {position: [21000, 40000], orientation: [0, -1]},  //bottom-left
        {position: [29000, 40000], orientation: [0, -1]},  //bottom-right
        {position: [10000, 21000], orientation: [1, 0]},   //left-top
        {position: [10000, 29000], orientation: [1, 0]},   //left-bottom
        {position: [40000, 21000], orientation: [-1, 0]},  //right-top
        {position: [40000, 29000], orientation: [-1, 0]}   //right-bottom
    ]
};

//unified formation spawner - takes formation dict, transforms by spawn position/orientation
//returns {ships: [], aircraft: []} to be added to activeAgents
function spawnFormation(formation, teamId, factionId, spawnPosXY, spawnOrientation) {
    let result = {ships: [], aircraft: []};

    //formation orientation is the "default" facing in the formation dict
    //we rotate everything so that default facing becomes spawnOrientation
    let fromDir = normalize(formation.formationOrientation || [0, -1]);
    let toDir = normalize(spawnOrientation);

    //build rotation matrix directly from vectors (no angle calculation needed)
    //cos(θ) = dot product, sin(θ) = 2D cross product
    let cos = fromDir[0] * toDir[0] + fromDir[1] * toDir[1];
    let sin = fromDir[0] * toDir[1] - fromDir[1] * toDir[0];

    //helper: rotate a 2D vector by the rotation matrix
    let rotateVec = (v) => [
        v[0] * cos - v[1] * sin,
        v[0] * sin + v[1] * cos
    ];

    //spawn ships
    if (formation.shipFormation) {
        for (let shipDef of formation.shipFormation) {
            let rotatedPos = rotateVec(shipDef.position);
            let worldPos = [spawnPosXY[0] + rotatedPos[0], spawnPosXY[1] + rotatedPos[1]];
            let worldOri = normalize(rotateVec(shipDef.orientation));

            let ship = createShip(teamId, factionId, shipDef.type, worldPos, worldOri);
            if (ship) result.ships.push(ship);
        }
    }
    //spawn aircraft (if any)
    if (formation.aircraftFormation) {
        for (let acDef of formation.aircraftFormation) {
            let rotatedPos = rotateVec(acDef.position);
            let worldPos = [spawnPosXY[0] + rotatedPos[0], spawnPosXY[1] + rotatedPos[1], 500];
            let worldOri = normalize(rotateVec(acDef.orientation));

            let ac = createAircraft(teamId, factionId, acDef.type, worldPos, worldOri);
            if (ac) result.aircraft.push(ac);
        }
    }
    return result;
}



// === GAME START ===

function startGameWithGameMode() {
    game.phase = 'playing';
    hideMenu();

    //initialize activeAgents structure and count factions
    game.activeAgents = {};
    let allFactions = []; //flat list of {teamId, factionId}
    for (let teamId in game.teams) {
        if (!game.teams[teamId].active) continue;
        game.activeAgents[teamId] = {};
        for (let factionId in game.teams[teamId].factions) {
            game.activeAgents[teamId][factionId] = {ships: [], aircraft: [], bases: []};
            allFactions.push({teamId, factionId});
        }
    }

    //pick spawn positions based on faction count (2, 4, or 8)
    let factionCount = allFactions.length;
    let posKey = factionCount <= 2 ? 2 : factionCount <= 4 ? 4 : 8;
    let spawnPositions = SPAWN_POSITIONS_SUPREMACY[posKey];

    //spawn each faction's fleet using the unified formation system
    for (let i = 0; i < allFactions.length; i++) {
        let {teamId, factionId} = allFactions[i];
        let spawnIdx = i % spawnPositions.length;
        let spawn = spawnPositions[spawnIdx];

        //use supremacy starter formation for now
        let result = spawnFormation(
            formationSupremacyStarter,
            teamId, factionId,
            spawn.position, spawn.orientation
        );

        game.activeAgents[teamId][factionId].ships = result.ships;
        game.activeAgents[teamId][factionId].aircraft = result.aircraft;
    }

    //center camera on map center
    camera.x = 25000;
    camera.y = 25000;
    camera.zoom = 10; //start fairly zoomed out to see fleets

    game.activeProjectiles = [];
    game.activeVFX = [];
    game.time = 0;
    game.isPaused = false;

    //start ambient sounds
    startSeaAmbience();

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

function forEachAircraft(callback) {
    for (let teamId in game.activeAgents) {
        for (let factionId in game.activeAgents[teamId]) {
            for (let ac of game.activeAgents[teamId][factionId].aircraft) {
                callback(ac, teamId, factionId);
            }
        }
    }
}

function forEachEnemyAircraft(myTeamId, callback) {
    for (let teamId in game.activeAgents) {
        if (parseInt(teamId) === parseInt(myTeamId)) continue;
        for (let factionId in game.activeAgents[teamId]) {
            for (let ac of game.activeAgents[teamId][factionId].aircraft) {
                callback(ac, teamId, factionId);
            }
        }
    }
}

// === GAME LOOP ===

let lastTime = 0;

function gameLoop(currentTime) {
    let dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    if (dt > 0.1) dt = 0.1; //cap dt to prevent spiral of death

    if (!game.isPaused && game.phase === 'playing') {
        targetAndFireAndUpdateCollisions(dt);
        updateAircraft(dt);
        updateProjectiles(dt);
        updateMovement(dt);
        spawnWaterTrails(dt);
        updateVFX(dt);
        pruneDeadAgents();
        game.time += dt;
    }

    if (game.phase === 'playing') updateHover();
    render();
    requestAnimationFrame(gameLoop);
}

// === MOVEMENT (ARC-BASED PATHFINDING) ===

function updateMovement(dt) {
    forEachShip(ship => {
        let t = SHIP_TEMPLATES[ship.shipType];

        if (!ship.targetPositionXY) {
            if (ship.currentSpeed > 0) ship.currentSpeed = Math.max(0, ship.currentSpeed - t.acceleration * dt);
            return;
        }

        let dx = ship.targetPositionXY[0] - ship.positionXY[0];
        let dy = ship.targetPositionXY[1] - ship.positionXY[1];
        let distToTarget = Math.hypot(dx, dy);

        if (distToTarget < 20) { ship.targetPositionXY = null; return; }

        let targetAngle = Math.atan2(dy, dx);
        let currentAngle = dirToAngle(ship.orientationDir);
        let angleDiff = normalizeAngle(targetAngle - currentAngle);

        //calculate turning radius at current speed: r = v / omega
        let speed = Math.max(ship.currentSpeed, t.maxSpeed * 0.3); //min speed for turn calc
        let turnRadius = speed / t.turnRate;

        //decide movement mode: arc turn vs straight
        let absAngle = Math.abs(angleDiff);
        let maxTurn = t.turnRate * dt;

        if (absAngle > 0.1) {
            //arc turn: follow curved path
            //calculate arc center (perpendicular to current direction)
            let turnDir = angleDiff > 0 ? 1 : -1;
            let perpX = -ship.orientationDir[1] * turnDir;
            let perpY = ship.orientationDir[0] * turnDir;
            let arcCenterX = ship.positionXY[0] + perpX * turnRadius;
            let arcCenterY = ship.positionXY[1] + perpY * turnRadius;

            //check if target is reachable from this arc (target distance from arc center)
            let targetToCenter = Math.hypot(ship.targetPositionXY[0] - arcCenterX, ship.targetPositionXY[1] - arcCenterY);

            //if target is close to our turning circle, we'll reach it via arc
            //otherwise turn until we can go straight
            let turnAmount = Math.min(absAngle, maxTurn) * turnDir;
            let newAngle = currentAngle + turnAmount;
            ship.orientationDir = normalize([Math.cos(newAngle), Math.sin(newAngle)]);

            //move along arc: position shifts around arc center
            let arcAngle = turnAmount;
            let cosA = Math.cos(arcAngle), sinA = Math.sin(arcAngle);
            let relX = ship.positionXY[0] - arcCenterX;
            let relY = ship.positionXY[1] - arcCenterY;
            ship.positionXY[0] = arcCenterX + relX * cosA - relY * sinA;
            ship.positionXY[1] = arcCenterY + relX * sinA + relY * cosA;

            //also move forward slightly to prevent stalling
            ship.positionXY[0] += ship.orientationDir[0] * speed * dt * 0.5;
            ship.positionXY[1] += ship.orientationDir[1] * speed * dt * 0.5;
        } else {
            //straight line: just move forward
            ship.positionXY[0] += ship.orientationDir[0] * ship.currentSpeed * dt;
            ship.positionXY[1] += ship.orientationDir[1] * ship.currentSpeed * dt;
        }

        //speed control: slow when turning sharply
        let angleFactor = 1 - Math.min(absAngle / Math.PI, 0.6);
        let targetSpeed = t.maxSpeed * angleFactor;
        if (ship.currentSpeed < targetSpeed) {
            ship.currentSpeed = Math.min(targetSpeed, ship.currentSpeed + t.acceleration * dt);
        } else {
            ship.currentSpeed = Math.max(targetSpeed, ship.currentSpeed - t.acceleration * dt);
        }
    });
}

// === AIRCRAFT UPDATE ===

function updateAircraft(dt) {
    forEachAircraft((ac, teamId) => {
        let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
        ac.flightTime += dt;
        ac.unitsAlive = Math.ceil(ac.health / t.healthPerUnit);

        //dogfighting
        if (ac.state === 'dogfight' && ac.dogfightTarget) {
            let enemy = ac.dogfightTarget;
            if (enemy.health <= 0) {
                ac.dogfightTarget = null;
                ac.state = 'idle';
            } else {
                //both deal damage based on DPS * fatigue * remaining units
                let myDPS = t.dogfightDPS * ac.fatigueMultiplier * ac.unitsAlive;
                let enemyT = AIRCRAFT_TEMPLATES[enemy.aircraftType];
                let enemyDPS = enemyT.dogfightDPS * enemy.fatigueMultiplier * enemy.unitsAlive;
                ac.health -= enemyDPS * dt;
                enemy.health -= myDPS * dt;
                //circle around each other
                let mx = (ac.positionXY[0] + enemy.positionXY[0]) / 2;
                let my = (ac.positionXY[1] + enemy.positionXY[1]) / 2;
                let angle = Math.atan2(ac.positionXY[1] - my, ac.positionXY[0] - mx) + dt * 2;
                ac.positionXY[0] = mx + Math.cos(angle) * 200;
                ac.positionXY[1] = my + Math.sin(angle) * 200;
            }
        }
        //bombing run
        else if (ac.state === 'bombing' && ac.bombTarget) {
            let target = ac.bombTarget;
            if (target.health <= 0) {
                ac.bombTarget = null;
                ac.state = 'returning';
            } else {
                let d = dist(ac.positionXY, target.positionXY);
                if (d < 500 && (ac.bombs > 0 || ac.torpedoes > 0)) {
                    //drop ordnance
                    if (ac.bombs > 0) {
                        ac.bombs--;
                        spawnBomb(ac, target);
                    } else if (ac.torpedoes > 0) {
                        ac.torpedoes--;
                        spawnTorpedo(ac, target);
                    }
                    if (ac.bombs <= 0 && ac.torpedoes <= 0) ac.state = 'returning';
                } else {
                    //fly toward target
                    moveAircraftToward(ac, target.positionXY, dt);
                }
            }
        }
        //moving to target position
        else if (ac.state === 'moving' && ac.targetPositionXY) {
            let d = dist(ac.positionXY, ac.targetPositionXY);
            if (d < 100) {
                ac.targetPositionXY = null;
                ac.state = 'idle';
            } else {
                moveAircraftToward(ac, ac.targetPositionXY, dt);
            }
        }
        //returning to carrier
        else if (ac.state === 'returning' && ac.homeCarrier) {
            if (ac.homeCarrier.health <= 0) {
                ac.homeCarrier = null;
                ac.state = 'idle';
            } else {
                let d = dist(ac.positionXY, ac.homeCarrier.positionXY);
                if (d < 200) {
                    //land and rearm
                    ac.flightTime = 0;
                    ac.torpedoes = t.torpedoCapacity || 0;
                    //arm with bombs if requested or if already armed
                    if (ac.armOnLanding || ac.armed) {
                        ac.armed = true;
                        ac.bombs = t.bombCapacity || 0;
                    }
                    ac.armOnLanding = false;
                    ac.health = Math.min(ac.maxHealth, ac.health + 20); //heal on landing
                    ac.state = 'idle';
                } else {
                    moveAircraftToward(ac, ac.homeCarrier.positionXY, dt);
                }
            }
        }
        //launching - takeoff animation from carrier
        else if (ac.state === 'launching') {
            //animations from a const structure 
            //anim = animations[aircraft];
            // f=loadPNG("fighterPlane.png");
            // squadronPreAnimationMode = true;
            // let acSpeed = 0;
            // for(let i=0;i<12;i++){
            //     while(speed<160){
            //         t.maxSpeed
            //     }
            // }
            
            

            //animation logic
            ac.launchProgress += dt;
            if (ac.homeCarrier && ac.homeCarrier.health > 0) {
                //move along carrier deck, then climb
                let carrier = ac.homeCarrier;
                let deckLength = SHIP_TEMPLATES.carrier.length;
                let runwayProgress = Math.min(ac.launchProgress / 2, 1); //2 seconds on deck

                //position along carrier runway
                let deckPos = -deckLength/2 + runwayProgress * deckLength;
                ac.positionXY[0] = carrier.positionXY[0] + carrier.orientationDir[0] * deckPos;
                ac.positionXY[1] = carrier.positionXY[1] + carrier.orientationDir[1] * deckPos;
                ac.orientationDir = [...carrier.orientationDir];

                //climb after leaving deck
                if (runwayProgress >= 1) {
                    ac.positionXYZ[2] = 50 + (ac.launchProgress - 2) * 150; //climb rate 150m/s
                    //move forward while climbing
                    ac.positionXY[0] += ac.orientationDir[0] * ac.currentSpeed * dt;
                    ac.positionXY[1] += ac.orientationDir[1] * ac.currentSpeed * dt;

                    if (ac.positionXYZ[2] >= 500) { //cruise altitude
                        ac.positionXYZ[2] = 500;
                        ac.state = 'idle';
                    }
                } else {
                    ac.positionXYZ[2] = 20; //deck height
                }
            } else {
                //carrier destroyed during takeoff
                ac.state = 'idle';
                ac.positionXYZ[2] = 500;
            }
        }
        //idle - check for nearby enemies to engage
        else if (ac.state === 'idle') {
            forEachEnemyAircraft(teamId, enemy => {
                if (ac.state !== 'idle') return;
                if (dist(ac.positionXY, enemy.positionXY) < 1500) {
                    ac.state = 'dogfight';
                    ac.dogfightTarget = enemy;
                    if (enemy.state === 'idle') {
                        enemy.state = 'dogfight';
                        enemy.dogfightTarget = ac;
                    }
                }
            });
        }

        //sync 2D and 3D position
        ac.positionXYZ[0] = ac.positionXY[0];
        ac.positionXYZ[1] = ac.positionXY[1];
    });
}

function moveAircraftToward(ac, targetXY, dt) {
    let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
    let dx = targetXY[0] - ac.positionXY[0];
    let dy = targetXY[1] - ac.positionXY[1];
    let targetAngle = Math.atan2(dy, dx);
    let currentAngle = dirToAngle(ac.orientationDir);
    let angleDiff = normalizeAngle(targetAngle - currentAngle);
    let maxTurn = t.turnRate * dt;
    let newAngle = currentAngle + clamp(angleDiff, -maxTurn, maxTurn);
    ac.orientationDir = normalize([Math.cos(newAngle), Math.sin(newAngle)]);
    ac.positionXY[0] += ac.orientationDir[0] * ac.currentSpeed * dt;
    ac.positionXY[1] += ac.orientationDir[1] * ac.currentSpeed * dt;
}

function spawnBomb(ac, target) {
    let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
    let errorRadius = ac.positionXYZ[2] * 0.1; //10% of altitude as error
    let destXY = [
        target.positionXY[0] + (Math.random() - 0.5) * errorRadius * 2,
        target.positionXY[1] + (Math.random() - 0.5) * errorRadius * 2
    ];
    game.activeProjectiles.push({
        id: randomId(), positionXY: [...ac.positionXY], destinationXY: destXY,
        velocityXY: [0, 0], damage: t.bombDamage, sourceTeam: ac.team,
        type: 'bomb', altitude: ac.positionXYZ[2], fallSpeed: 200
    });
}

function spawnTorpedo(ac, target) {
    let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
    let dir = normalize([target.positionXY[0] - ac.positionXY[0], target.positionXY[1] - ac.positionXY[1]]);
    game.activeProjectiles.push({
        id: randomId(), positionXY: [...ac.positionXY], destinationXY: [...target.positionXY],
        velocityXY: [dir[0] * 25, dir[1] * 25], damage: t.torpedoDamage || 300,
        sourceTeam: ac.team, type: 'torpedo', targetShip: target
    });
}

// === WATER TRAILS ===

let lastTrailTime = 0;
function spawnWaterTrails(dt) {
    lastTrailTime += dt;
    if (lastTrailTime < 0.3) return;
    lastTrailTime = 0;
    forEachShip(ship => {
        if (ship.currentSpeed > 1) {
            let t = SHIP_TEMPLATES[ship.shipType];
            //spawn trail behind ship at stern position
            let sternX = ship.positionXY[0] - ship.orientationDir[0] * (t.length / 2);
            let sternY = ship.positionXY[1] - ship.orientationDir[1] * (t.length / 2);
            game.activeVFX.push({
                type: 'trail', positionXY: [sternX, sternY], age: 0, maxAge: 5,
                dir: [...ship.orientationDir], length: ship.currentSpeed * 3 + t.beam,
                width: t.beam * 0.6
            });
        }
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
            //cannon hitpoints: priority-based targeting against ships
            //skip AA (aircraft only) and torpedoMount (no auto-targeting yet)
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type === 'AA' || hp.type === 'torpedoMount' || hp.type === 'hangarBay') continue;
                if (hp.cooldown > 0.0001) continue;

                let best = findBestShipTarget(ship, hp);
                if (best) {
                    fireAtShip(ship, hp, best);
                    hp.cooldown = HITPOINT_TYPES[hp.type].maxCooldown;
                }
            }

            //AA hitpoints: distance-based, targets aircraft
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type !== 'AA') continue;
                if (hp.cooldown > 0.0001) continue;
                let target = findClosestEnemyAircraft(ship);
                if (target) {
                    fireAAatAircraft(ship, hp, target);
                    hp.cooldown = HITPOINT_TYPES.AA.maxCooldown;
                }
            }
            //torpedoMount: fires sideways only when enemy in arc
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type !== 'torpedoMount') continue;
                if (hp.cooldown > 0.0001) continue;
                let target = findTorpedoTarget(ship, hp);
                if (target) {
                    fireShipTorpedo(ship, hp, target);
                    hp.cooldown = HITPOINT_TYPES.torpedoMount.maxCooldown;
                }
            }

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

            //cannon hitpoints fire at locked target
            for (let hpName in ship.hitpoints) {
                let hp = ship.hitpoints[hpName];
                if (hp.destroyed || hp.type === 'AA' || hp.type === 'torpedoMount' || hp.type === 'hangarBay') continue;
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

function findClosestEnemyAircraft(ship) {
    let closest = null, closestDist = HITPOINT_TYPES.AA.range;
    forEachEnemyAircraft(ship.team, ac => {
        let d = dist(ship.positionXY, ac.positionXY);
        if (d < closestDist) { closestDist = d; closest = ac; }
    });
    return closest;
}

function fireAAatAircraft(ship, hp, target) {
    let hpXY = getHitpointWorldPos(ship, hp);
    playSound('AA', hpXY);
    //spawn AA projectile that travels toward target
    let projSpeed = HITPOINT_TYPES.AA.projectileSpeed;
    let d = dist(hpXY, target.positionXY);
    let timeToHit = d / projSpeed;
    //lead targeting for aircraft
    let aimXY = [
        target.positionXY[0] + target.orientationDir[0] * target.currentSpeed * timeToHit,
        target.positionXY[1] + target.orientationDir[1] * target.currentSpeed * timeToHit
    ];
    //add accuracy error
    let error = d * 0.08;
    aimXY[0] += (Math.random() - 0.5) * error;
    aimXY[1] += (Math.random() - 0.5) * error;
    let dir = normalize([aimXY[0] - hpXY[0], aimXY[1] - hpXY[1]]);
    game.activeProjectiles.push({
        id: randomId(), positionXY: [...hpXY], destinationXY: aimXY,
        velocityXY: [dir[0] * projSpeed, dir[1] * projSpeed],
        damage: HITPOINT_TYPES.AA.damage, sourceTeam: ship.team,
        type: 'AA', targetAircraft: target
    });
}

function findTorpedoTarget(ship, hp) {
    //torpedoes fire sideways - check if enemy is roughly perpendicular
    let hpXY = getHitpointWorldPos(ship, hp);
    let isLeft = hp.relPosXY[0] < 0;
    let torpDir = isLeft ? [-ship.orientationDir[1], ship.orientationDir[0]]
                        : [ship.orientationDir[1], -ship.orientationDir[0]];
    let best = null, bestDist = HITPOINT_TYPES.torpedoMount.range;
    forEachEnemyShip(ship.team, enemy => {
        let toEnemy = normalize([enemy.positionXY[0] - hpXY[0], enemy.positionXY[1] - hpXY[1]]);
        let dot = toEnemy[0] * torpDir[0] + toEnemy[1] * torpDir[1];
        if (dot < 0.5) return; //must be roughly in torpedo arc (60 deg)
        let d = dist(hpXY, enemy.positionXY);
        if (d < bestDist) { bestDist = d; best = enemy; }
    });
    return best;
}

function fireShipTorpedo(ship, hp, target) {
    if (ship.torpedoCount <= 0) return;
    let hpXY = getHitpointWorldPos(ship, hp);
    playSound('splash', hpXY); //torpedo launch splash
    let dir = normalize([target.positionXY[0] - hpXY[0], target.positionXY[1] - hpXY[1]]);
    let speed = HITPOINT_TYPES.torpedoMount.projectileSpeed;
    game.activeProjectiles.push({
        id: randomId(), positionXY: [...hpXY],
        velocityXY: [dir[0] * speed, dir[1] * speed],
        destinationXY: [...target.positionXY],
        damage: HITPOINT_TYPES.torpedoMount.damage,
        sourceTeam: ship.team, type: 'torpedo', targetShip: target
    });
    ship.torpedoCount--;
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
    //play cannon sound based on caliber
    let soundName = 'cannon' + hp.type.charAt(0).toUpperCase() + hp.type.slice(1);
    playSound(soundName, hpWorldXY);

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

        if (proj.type === 'bomb') {
            //bombs fall straight down (in altitude), drift toward destination
            proj.altitude -= proj.fallSpeed * dt;
            let drift = 50 * dt;
            let dx = proj.destinationXY[0] - proj.positionXY[0];
            let dy = proj.destinationXY[1] - proj.positionXY[1];
            let d = Math.hypot(dx, dy);
            if (d > drift) {
                proj.positionXY[0] += (dx / d) * drift;
                proj.positionXY[1] += (dy / d) * drift;
            }
            if (proj.altitude <= 0) {
                let hitShip = findShipAtPoint(proj.positionXY, proj.sourceTeam);
                if (hitShip) {
                    applyDamageToShip(hitShip, proj.damage, proj.positionXY);
                    spawnVFX('hit', proj.positionXY);
                    playSound('hit', proj.positionXY);
                } else {
                    spawnVFX('splash', proj.positionXY);
                    playSound('splash', proj.positionXY);
                }
                game.activeProjectiles.splice(i, 1);
            }
        } else if (proj.type === 'torpedo') {
            //torpedoes track target ship slowly
            if (proj.targetShip && proj.targetShip.health > 0) {
                let dir = normalize([proj.targetShip.positionXY[0] - proj.positionXY[0],
                                    proj.targetShip.positionXY[1] - proj.positionXY[1]]);
                proj.velocityXY = [dir[0] * 25, dir[1] * 25];
            }
            proj.positionXY[0] += proj.velocityXY[0] * dt;
            proj.positionXY[1] += proj.velocityXY[1] * dt;

             //spawn water trail behind torpedo
            if (!proj.lastTrailTime) proj.lastTrailTime = 0;
            proj.lastTrailTime += dt;
            if (proj.lastTrailTime >= 0.1) { //spawn trail every 0.1 seconds (more frequent than ships)
                proj.lastTrailTime = 0;
                let speed = Math.hypot(proj.velocityXY[0], proj.velocityXY[1]);
                if (speed > 0) {
                    let dir = normalize(proj.velocityXY);
                    //trail spawns behind torpedo (opposite direction of travel)
                    let trailX = proj.positionXY[0] - dir[0] * 2; //2m behind
                    let trailY = proj.positionXY[1] - dir[1] * 2;
                    game.activeVFX.push({
                        type: 'trail', 
                        positionXY: [trailX, trailY], 
                        age: 0, 
                        maxAge: 3, //shorter than ship trails
                        dir: [-dir[0], -dir[1]], //point backward
                        length: speed * 0.5, //shorter trail than ships
                        width: 1.5 //narrower than ship trails
                    });
                }
            }

            let hitShip = findShipAtPoint(proj.positionXY, proj.sourceTeam);
            if (hitShip) {
                applyDamageToShip(hitShip, proj.damage, proj.positionXY);
                spawnVFX('hit', proj.positionXY);
                playSound('hit', proj.positionXY);
                game.activeProjectiles.splice(i, 1);
            } else if (dist(proj.positionXY, proj.destinationXY) > 15000) {
                game.activeProjectiles.splice(i, 1);
            }
        } else if (proj.type === 'AA') {
            //AA projectile - check if reached destination or hit aircraft
            proj.positionXY[0] += proj.velocityXY[0] * dt;
            proj.positionXY[1] += proj.velocityXY[1] * dt;
            if (dist(proj.positionXY, proj.destinationXY) < 50) {
                //check if aircraft is near destination
                if (proj.targetAircraft && proj.targetAircraft.health > 0) {
                    let acDist = dist(proj.positionXY, proj.targetAircraft.positionXY);
                    if (acDist < 80) {
                        proj.targetAircraft.health -= proj.damage;
                        spawnVFX('AAburst', proj.positionXY);
                    }
                }
                game.activeProjectiles.splice(i, 1);
            }
        } else {
            //shell projectile - move and check destination
            proj.positionXY[0] += proj.velocityXY[0] * dt;
            proj.positionXY[1] += proj.velocityXY[1] * dt;
            if (dist(proj.positionXY, proj.destinationXY) < 20) {
                let hitShip = findShipAtPoint(proj.destinationXY, proj.sourceTeam);
                if (hitShip) {
                    applyDamageToShip(hitShip, proj.damage, proj.destinationXY);
                    spawnVFX('hit', proj.destinationXY);
                    playSound('hit', proj.destinationXY);
                } else {
                    spawnVFX('splash', proj.destinationXY);
                    playSound('splash', proj.destinationXY);
                }
                game.activeProjectiles.splice(i, 1);
            }
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
            //prune ships
            let ships = game.activeAgents[teamId][factionId].ships;
            for (let i = ships.length - 1; i >= 0; i--) {
                if (ships[i].health <= 0) {
                    let idx = input.selectedAgents.indexOf(ships[i]);
                    if (idx !== -1) input.selectedAgents.splice(idx, 1);
                    spawnVFX('hit', ships[i].positionXY);
                    ships.splice(i, 1);
                }
            }
            //prune aircraft
            let aircraft = game.activeAgents[teamId][factionId].aircraft;
            for (let i = aircraft.length - 1; i >= 0; i--) {
                if (aircraft[i].health <= 0) {
                    let idx = input.selectedAgents.indexOf(aircraft[i]);
                    if (idx !== -1) input.selectedAgents.splice(idx, 1);
                    spawnVFX('hit', aircraft[i].positionXY);
                    aircraft.splice(i, 1);
                }
            }
        }
    }
}

// === RENDERING ===

//simple depth-based sea with wave patterns
function renderSeaTexture() {
    //base deep sea color
    ctx.fillStyle = '#0d2a44';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (game.phase !== 'playing') return;

    //draw varying depth bands based on world position (simulates underwater topology)
    let bandSize = 2000 / camera.zoom; //world size of each depth band
    let worldTopLeft = screenToWorld(0, 0);
    let worldBotRight = screenToWorld(canvas.width, canvas.height);

    //draw depth variation using simple sine pattern
    let step = Math.max(4, 50 / camera.zoom); //pixel step size
    for (let sy = 0; sy < canvas.height; sy += step) {
        for (let sx = 0; sx < canvas.width; sx += step) {
            let [wx, wy] = screenToWorld(sx, sy);
            //depth based on distance from map center and sine wave patterns
            let distFromCenter = Math.hypot(wx - 25000, wy - 25000);
            let baseDepth = 0.3 + 0.4 * (distFromCenter / 35000); //deeper toward edges
            //add wave patterns
            let wave1 = Math.sin(wx * 0.0003 + wy * 0.0002) * 0.15;
            let wave2 = Math.sin(wx * 0.0001 - wy * 0.00015) * 0.1;
            let depth = clamp(baseDepth + wave1 + wave2, 0, 1);

            //color: shallow = lighter cyan, deep = darker blue
            let r = Math.floor(15 + (1 - depth) * 30);
            let g = Math.floor(45 + (1 - depth) * 60);
            let b = Math.floor(70 + (1 - depth) * 50);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(sx, sy, step, step);
        }
    }

    //add subtle wave highlights (only when zoomed in enough)
    if (camera.zoom < 5) {
        ctx.strokeStyle = 'rgba(150,200,230,0.1)';
        ctx.lineWidth = 1;
        let waveSpacing = 300 / camera.zoom;
        let offset = (game.time || 0) * 20; //animate waves
        for (let i = -2; i < canvas.width / waveSpacing + 2; i++) {
            let sx = (i * waveSpacing + offset % waveSpacing);
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            for (let y = 0; y < canvas.height; y += 20) {
                ctx.lineTo(sx + Math.sin(y * 0.01 + offset * 0.1) * 10, y);
            }
            ctx.stroke();
        }
    }
}

function render() {
    //depth-based sea texture - draw gradient strips based on world position
    renderSeaTexture();

    if (game.phase !== 'playing') return;

    //render water trails first (behind everything)
    for (let vfx of game.activeVFX) {
        if (vfx.type === 'trail') renderWaterTrail(vfx);
    }

    //render ships
    forEachShip((ship, teamId, factionId) => renderShip(ship, teamId, factionId));

    //render aircraft shadows
    forEachAircraft(ac => renderAircraftShadow(ac));

    //render projectiles
    for (let proj of game.activeProjectiles) renderProjectile(proj);

    //render aircraft (above everything else)
    forEachAircraft((ac, teamId, factionId) => renderAircraft(ac, teamId, factionId));

    //render VFX (except trails which were rendered first)
    for (let vfx of game.activeVFX) {
        if (vfx.type !== 'trail') renderVFX(vfx);
    }

    //selection box
    if (input.isDragging && input.dragStartXY && input.dragEndXY) {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        let x = Math.min(input.dragStartXY[0], input.dragEndXY[0]);
        let y = Math.min(input.dragStartXY[1], input.dragEndXY[1]);
        ctx.strokeRect(x, y, Math.abs(input.dragEndXY[0] - input.dragStartXY[0]),
                            Math.abs(input.dragEndXY[1] - input.dragStartXY[1]));
        ctx.setLineDash([]);
    }
}

function renderShip(ship, teamId, factionId) {
    let t = SHIP_TEMPLATES[ship.shipType];
    let sXY = worldToScreen(ship.positionXY[0], ship.positionXY[1]);
    let sB = t.beam / camera.zoom, sL = t.length / camera.zoom;
    let faction = game.teams[teamId]?.factions[factionId];
    let color = faction?.color || '#888';
    let angle = Math.atan2(ship.orientationDir[1], ship.orientationDir[0]) + Math.PI/2;

    ctx.save();
    ctx.translate(sXY[0], sXY[1]);
    ctx.rotate(angle);

    //hull: ellipse for most ships, rectangle for carrier
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    if (ship.shipType === 'carrier') {
        ctx.fillRect(-sB/2, -sL/2, sB, sL);
        ctx.strokeRect(-sB/2, -sL/2, sB, sL);
        //flight deck lines
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(-sB/3, -sL/2); ctx.lineTo(-sB/3, sL/2);
        ctx.moveTo(sB/3, -sL/2); ctx.lineTo(sB/3, sL/2);
        ctx.stroke();
        //bridge on starboard side
        ctx.fillStyle = '#444';
        ctx.fillRect(sB/2 - 4/camera.zoom, -sL*0.3, 8/camera.zoom, sL*0.15);
    } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, sB/2, sL/2, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
    }

    //superstructures
    ctx.fillStyle = '#555';
    let supers = SUPERSTRUCTURES[ship.shipType] || [];
    for (let s of supers) {
        let sy = s.y / camera.zoom, sw = s.w / camera.zoom, sh = s.h / camera.zoom;
        if (ship.shipType === 'carrier') {
            ctx.fillRect(sB/2 - sw, sy - sh/2, sw, sh); //bridge on side
        } else {
            ctx.fillRect(-sw/2, sy - sh/2, sw, sh);
        }
    }

    //turrets and AA - draw after hull
    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        let rx = hp.relPosXY[0] / camera.zoom, ry = hp.relPosXY[1] / camera.zoom;

        if (hp.type === 'AA') {
            //AA cluster: 3 small black squares
            ctx.fillStyle = hp.destroyed ? '#222' : '#111';
            let sqSize = 2 / camera.zoom;
            ctx.fillRect(rx - sqSize*1.5, ry - sqSize/2, sqSize, sqSize);
            ctx.fillRect(rx - sqSize/2, ry - sqSize/2, sqSize, sqSize);
            ctx.fillRect(rx + sqSize/2, ry - sqSize/2, sqSize, sqSize);
        } else if (hp.type !== 'hangarBay') {
            //turret: dark circle with radius based on gun caliber
            let rad = (TURRET_RADII[hp.type] || 4) / camera.zoom;
            ctx.fillStyle = hp.destroyed ? '#222' : '#333';
            ctx.beginPath();
            ctx.arc(rx, ry, rad, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
    ctx.restore();

    let isSelected = input.selectedAgents.includes(ship);
    let isHovered = input.hoveredShip === ship;

    //selection ring (faction color)
    if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], Math.max(sB, sL)/2 + 5, 0, Math.PI*2);
        ctx.stroke();
    }

    //health bar
    if (isSelected || isHovered) {
        let barW = 50, barH = 6;
        let barX = sXY[0] - barW/2, barY = sXY[1] - sL/2 - 15;
        let pct = ship.health / ship.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = pct > 0.6 ? '#0f0' : pct > 0.3 ? '#ff0' : '#f00';
        ctx.fillRect(barX, barY, barW * pct, barH);

        //hitpoint health bars when hovered
        if (isHovered) renderHitpointBars(ship);
    }
}

function renderHitpointBars(ship) {
    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        if (hp.destroyed || hp.type === 'hangarBay') continue;
        let hpXY = worldToScreen(...getHitpointWorldPos(ship, hp));
        let rad = (TURRET_RADII[hp.type] || 4) / camera.zoom;
        let barW = 16, barH = 2;
        let pct = hp.health / hp.maxHealth;
        ctx.fillStyle = '#222';
        ctx.fillRect(hpXY[0] - barW/2, hpXY[1] - rad - 5, barW, barH);
        ctx.fillStyle = pct > 0.6 ? '#0f0' : pct > 0.3 ? '#ff0' : '#f00';
        ctx.fillRect(hpXY[0] - barW/2, hpXY[1] - rad - 5, barW * pct, barH);

        //highlight hovered hitpoint
        if (input.hoveredHitpoint?.name === hpName && input.hoveredShip === ship) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(hpXY[0], hpXY[1], rad + 3, 0, Math.PI*2);
            ctx.stroke();
        }
    }
}

function renderProjectile(proj) {
    let sXY = worldToScreen(proj.positionXY[0], proj.positionXY[1]);

    if (proj.type === 'bomb') {
        let size = 3 / camera.zoom;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], Math.max(size, 2), 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    if (proj.type === 'torpedo') {
        let angle = Math.atan2(proj.velocityXY[1], proj.velocityXY[0]);
        let len = 8 / camera.zoom;
        ctx.save();
        ctx.translate(sXY[0], sXY[1]);
        ctx.rotate(angle);
        ctx.fillStyle = '#334';
        ctx.fillRect(-len, -Math.max(1, 2/camera.zoom), len * 2, Math.max(2, 4/camera.zoom));
        ctx.restore();
        return;
    }
    if (proj.type === 'AA') {
        //small yellow dot for AA tracer
        let size = 2 / camera.zoom;
        ctx.fillStyle = '#ff8';
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], Math.max(size, 1), 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    //shell projectile - simple circle, scales with zoom
    let baseSize = proj.type === 'in18' ? 4 : proj.type === 'in13' ? 3.5 : proj.type === 'in9' ? 3 : 2.5;
    let size = baseSize / camera.zoom;
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(sXY[0], sXY[1], Math.max(size, 1.5), 0, Math.PI * 2);
    ctx.fill();
}

function renderAircraft(ac, teamId, factionId) {
    let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
    let sXY = worldToScreen(ac.positionXY[0], ac.positionXY[1]);
    let faction = game.teams[teamId]?.factions[factionId];
    let img = images[t.image];
    let angle = Math.atan2(ac.orientationDir[1], ac.orientationDir[0]) + Math.PI/2;
    let scale = 25 / camera.zoom; //individual aircraft sprite size
    let stepX = (t.formationStepX || 20) / camera.zoom; //V spacing horizontal
    let stepY = (t.formationStepY || 6) / camera.zoom; //V spacing vertical
    let alive = ac.unitsAlive || Math.ceil(ac.health / t.healthPerUnit);

    //draw each surviving plane in V-formation
    ctx.save();
    ctx.translate(sXY[0], sXY[1]);
    ctx.rotate(angle);

    for (let i = 0; i < alive; i++) {
        //V-formation: leader at front, alternating left/right
        let side = (i % 2 === 0) ? 1 : -1;
        let row = Math.floor((i + 1) / 2);
        let offX = side * row * stepX;
        let offY = row * stepY;

        if (img) {
            ctx.drawImage(img, offX - scale/2, offY - scale/2, scale, scale);
        } else {
            //fallback triangle
            ctx.fillStyle = faction?.color || '#888';
            ctx.beginPath();
            ctx.moveTo(offX, offY - scale/2);
            ctx.lineTo(offX - scale/3, offY + scale/2);
            ctx.lineTo(offX + scale/3, offY + scale/2);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.restore();

    //selection ring - size based on formation width
    let formationRadius = (alive > 1 ? Math.ceil(alive / 2) * stepX : 0) + scale + 8;
    if (input.selectedAgents.includes(ac)) {
        ctx.strokeStyle = faction?.color || '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], formationRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    //health bar
    if (input.selectedAgents.includes(ac) || ac === input.hoveredShip) {
        let barW = 40, barH = 4;
        let pct = ac.health / ac.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(sXY[0] - barW/2, sXY[1] - formationRadius - 8, barW, barH);
        ctx.fillStyle = pct > 0.6 ? '#0f0' : pct > 0.3 ? '#ff0' : '#f00';
        ctx.fillRect(sXY[0] - barW/2, sXY[1] - formationRadius - 8, barW * pct, barH);
    }
}

function renderAircraftShadow(ac) {
    let t = AIRCRAFT_TEMPLATES[ac.aircraftType];
    let alt = ac.positionXYZ[2] || 500;
    let shadowOffset = alt * 0.15;
    let stepX = (t.formationStepX || 20);
    let stepY = (t.formationStepY || 6);
    let alive = ac.unitsAlive || Math.ceil(ac.health / t.healthPerUnit);
    //angle+PI/2 because aircraft rendering uses that offset
    let angle = Math.atan2(ac.orientationDir[1], ac.orientationDir[0]) + Math.PI/2;
    let cos = Math.cos(angle), sin = Math.sin(angle);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < alive; i++) {
        let side = (i % 2 === 0) ? 1 : -1;
        let row = Math.floor((i + 1) / 2);
        let offX = side * row * stepX;
        let offY = row * stepY;
        //rotate offset by aircraft orientation (same transform as rendering)
        let rotX = offX * cos - offY * sin;
        let rotY = offX * sin + offY * cos;
        let shadowX = ac.positionXY[0] + rotX - SUN_DIR[0] * shadowOffset;
        let shadowY = ac.positionXY[1] + rotY - SUN_DIR[1] * shadowOffset;
        let sXY = worldToScreen(shadowX, shadowY);
        ctx.beginPath();
        ctx.ellipse(sXY[0], sXY[1], 12/camera.zoom, 6/camera.zoom, angle, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderWaterTrail(vfx) {
    let sXY = worldToScreen(vfx.positionXY[0], vfx.positionXY[1]);
    let alpha = 0.35 * (1 - vfx.age / vfx.maxAge);
    let len = vfx.length / camera.zoom;
    let width = (vfx.width || 8) / camera.zoom;
    ctx.strokeStyle = `rgba(200,230,255,${alpha})`;
    ctx.lineWidth = Math.max(width, 1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sXY[0], sXY[1]);
    ctx.lineTo(sXY[0] - vfx.dir[0] * len, sXY[1] - vfx.dir[1] * len);
    ctx.stroke();
}

function renderVFX(vfx) {
    let sXY = worldToScreen(vfx.positionXY[0], vfx.positionXY[1]);
    let alpha = 1 - vfx.age / vfx.maxAge;

    if (vfx.type === 'AAstream') {
        //yellow stream from gun to target
        let tXY = worldToScreen(vfx.targetXY[0], vfx.targetXY[1]);
        ctx.strokeStyle = `rgba(255,255,100,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sXY[0], sXY[1]);
        ctx.lineTo(tXY[0], tXY[1]);
        ctx.stroke();
    } else if (vfx.type === 'AAburst') {
        //bright flash then grey cloud
        let size = 10 + vfx.age * 20;
        if (vfx.age < 0.3) {
            ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        } else {
            ctx.fillStyle = `rgba(100,100,100,${alpha * 0.5})`;
        }
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], size / camera.zoom, 0, Math.PI * 2);
        ctx.fill();
    } else if (vfx.type === 'hit') {
        let size = 20 * (1 + vfx.age * 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], size / camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (vfx.type === 'splash') {
        let size = 15 * (1 + vfx.age * 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#8cf';
        ctx.beginPath();
        ctx.arc(sXY[0], sXY[1], size / camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// === INPUT HANDLING ===

canvas.addEventListener('mousedown', e => {
    if (game.phase !== 'playing') return;

    if (e.button === 0) { //left click
        input.isDragging = true;
        input.dragStartXY = [e.offsetX, e.offsetY];
        input.dragEndXY = [...input.dragStartXY];
    }
    if (e.button === 1) { //middle click - pan/rotate
        e.preventDefault();
        input.middleDragging = true;
        input.middleStartXY = [e.offsetX, e.offsetY];
    }
});

canvas.addEventListener('mousemove', e => {
    input.mouseScreenXY = [e.offsetX, e.offsetY];
    input.mouseWorldXY = screenToWorld(e.offsetX, e.offsetY);

    if (input.isDragging) {
        input.dragEndXY = [e.offsetX, e.offsetY];
    }
    if (input.middleDragging && input.middleStartXY) {
        let dx = e.offsetX - input.middleStartXY[0];
        let dy = e.offsetY - input.middleStartXY[1];
        //horizontal drag = rotate view, vertical drag = pan
        camera.rotation += dx * 0.003;
        //pan in rotated space
        let cos = Math.cos(-camera.rotation), sin = Math.sin(-camera.rotation);
        let panX = dy * sin * camera.zoom;
        let panY = dy * cos * camera.zoom;
        camera.x -= panX;
        camera.y -= panY;
        input.middleStartXY = [e.offsetX, e.offsetY];
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

    if (e.button === 1) { //middle mouse release
        input.middleDragging = false;
        input.middleStartXY = null;
    }

    if (e.button === 2) { //right click - move/target command
        let worldXY = screenToWorld(e.offsetX, e.offsetY);

        //check if clicking on an enemy ship
        let clickedResult = getShipAtPoint(worldXY);
        if (clickedResult && parseInt(clickedResult.teamId) !== localPlayer.team) {
            //targeting an enemy ship
            let enemyShip = clickedResult.ship;
            let hpResult = getHitpointAtPoint(worldXY, enemyShip);

            for (let unit of input.selectedAgents) {
                if (unit.shipType) {
                    //manual torpedo mode: fire at target
                    if (unit.manualTorpedoMode && unit.torpedoCount > 0) {
                        fireManualTorpedo(unit, enemyShip);
                        unit.manualTorpedoMode = false;
                    } else {
                        //normal targeting
                        if (hpResult) {
                            unit.targetMode = 'hitpoint';
                            unit.lockedTarget = enemyShip;
                            unit.lockedHitpoint = hpResult.name;
                        } else {
                            unit.targetMode = 'agent';
                            unit.lockedTarget = enemyShip;
                            unit.lockedHitpoint = null;
                        }
                        unit.targetPositionXY = [...enemyShip.positionXY];
                    }
                } else if (unit.aircraftType) {
                    //aircraft: set bomb target if armed, else move
                    if ((unit.armed && unit.bombs > 0) || unit.torpedoes > 0) {
                        unit.state = 'bombing';
                        unit.bombTarget = enemyShip;
                    } else {
                        unit.state = 'moving';
                        unit.targetPositionXY = [...enemyShip.positionXY];
                    }
                }
            }
        } else {
            //move command - also clear torpedo mode
            for (let unit of input.selectedAgents) {
                if (unit.shipType) {
                    unit.targetPositionXY = [...worldXY];
                    unit.targetMode = 'auto';
                    unit.lockedTarget = null;
                    unit.lockedHitpoint = null;
                    unit.manualTorpedoMode = false;
                } else if (unit.aircraftType) {
                    unit.state = 'moving';
                    unit.targetPositionXY = [...worldXY];
                }
            }
        }
        updateBottomPanel();
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
    let found = false;

    //find ship under click (only own faction)
    forEachShip((ship, teamId, factionId) => {
        if (parseInt(teamId) !== localPlayer.team) return;
        if (factionId !== localPlayer.faction) return;

        if (pointInShip(worldXY, ship)) {
            let idx = input.selectedAgents.indexOf(ship);
            if (idx === -1) {
                input.selectedAgents.push(ship);
                found = true;
            } else if (input.shiftHeld) {
                input.selectedAgents.splice(idx, 1);
            }
        }
    });

    //also check aircraft
    forEachAircraft((ac, teamId, factionId) => {
        if (parseInt(teamId) !== localPlayer.team) return;
        if (factionId !== localPlayer.faction) return;
        if (dist(worldXY, ac.positionXY) < 50) {
            if (!input.selectedAgents.includes(ac)) {
                input.selectedAgents.push(ac);
                found = true;
            }
        }
    });

    if (found) playSound('select', worldXY);
    updateBottomPanel();
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
        let x = ship.positionXY[0], y = ship.positionXY[1];
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            let idx = input.selectedAgents.indexOf(ship);
            if (input.shiftHeld && idx !== -1) {
                input.selectedAgents.splice(idx, 1); //toggle off
            } else if (idx === -1) {
                input.selectedAgents.push(ship);
            }
        }
    });

    forEachAircraft((ac, teamId, factionId) => {
        if (parseInt(teamId) !== localPlayer.team) return;
        if (factionId !== localPlayer.faction) return;
        let x = ac.positionXY[0], y = ac.positionXY[1];
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            let idx = input.selectedAgents.indexOf(ac);
            if (input.shiftHeld && idx !== -1) {
                input.selectedAgents.splice(idx, 1); //toggle off
            } else if (idx === -1) {
                input.selectedAgents.push(ac);
            }
        }
    });

    if (input.selectedAgents.length > 0) playSound('select', [(minX+maxX)/2, (minY+maxY)/2]);
    updateBottomPanel();
}

// === BOTTOM UI PANEL ===

function updateBottomPanel() {
    let panel = document.getElementById('bottomPanel');
    let container = document.getElementById('selectedUnitsContainer');
    let actionsDiv = document.getElementById('actionButtons');

    if (input.selectedAgents.length === 0) {
        panel.classList.remove('visible');
        return;
    }

    panel.classList.add('visible');
    container.innerHTML = '';
    actionsDiv.innerHTML = '';

    //show cards for each selected unit - click to select only that unit
    for (let i = 0; i < input.selectedAgents.length; i++) {
        let unit = input.selectedAgents[i];
        let card = document.createElement('div');
        card.className = 'unitCard';
        let isShip = unit.shipType !== undefined;
        let typeName = isShip ? unit.shipType : unit.aircraftType;
        let icon = isShip ? (typeName === 'carrier' ? '⛴' : '🚢') : '✈';
        let pct = unit.health / unit.maxHealth;
        card.innerHTML = `
            <div class="unitIcon">${icon}</div>
            <span>${typeName}</span>
            <div class="healthBar"><div class="healthFill" style="width:${pct*100}%;background:${pct>0.6?'#0f0':pct>0.3?'#ff0':'#f00'}"></div></div>
        `;
        let idx = i;
        card.onclick = () => { input.selectedAgents = [input.selectedAgents[idx]]; updateBottomPanel(); };
        container.appendChild(card);
    }

    //show actions based on selected type
    let firstUnit = input.selectedAgents[0];
    let isShip = firstUnit.shipType !== undefined;

    if (isShip && firstUnit.shipType === 'carrier') {
        //carrier: show squadron launch options
        actionsDiv.innerHTML = '<h4 style="color:#8cf;margin:0 0 6px">Squadrons</h4>';
        if (firstUnit.storedSquadrons) {
            for (let i = 0; i < firstUnit.storedSquadrons.length; i++) {
                let sq = firstUnit.storedSquadrons[i];
                if (sq.count <= 0) continue;
                let row = document.createElement('div');
                row.className = 'squadronRow';
                row.innerHTML = `
                    <span>${sq.type.replace('Squadron','')} x${sq.count}</span>
                    <button class="launchBtn" onclick="launchSquadron(${input.selectedAgents.indexOf(firstUnit)}, ${i})">Launch</button>
                `;
                actionsDiv.appendChild(row);
            }
        }
    } else if (isShip && firstUnit.torpedoCount > 0) {
        //ships with torpedoes: manual fire option
        let btn = document.createElement('button');
        btn.className = 'actionBtn';
        btn.textContent = `Fire Torpedoes (${firstUnit.torpedoCount} left)`;
        btn.onclick = () => setManualTorpedoMode();
        actionsDiv.appendChild(btn);
    } else if (!isShip) {
        //aircraft: show arm/behavior options
        let t = AIRCRAFT_TEMPLATES[firstUnit.aircraftType];
        if (t.bombCapacity && !firstUnit.armed && firstUnit.homeCarrier) {
            let btn = document.createElement('button');
            btn.className = 'actionBtn';
            btn.textContent = 'Return to Arm Bombs';
            btn.onclick = () => returnToArmBombs();
            actionsDiv.appendChild(btn);
        }
        if (firstUnit.armed && firstUnit.bombs > 0) {
            let btn = document.createElement('button');
            btn.className = 'actionBtn';
            btn.textContent = `Attack (${firstUnit.bombs} bombs)`;
            btn.onclick = () => setBombingMode();
            actionsDiv.appendChild(btn);
        }
        //return to carrier button
        if (firstUnit.homeCarrier && firstUnit.state !== 'returning') {
            let btn = document.createElement('button');
            btn.className = 'actionBtn';
            btn.textContent = 'Return to Carrier';
            btn.onclick = () => returnToCarrier();
            actionsDiv.appendChild(btn);
        }
    }
}

function launchSquadron(shipIdx, sqIdx) {
    let carrier = input.selectedAgents[shipIdx];
    if (!carrier || !carrier.storedSquadrons) return;
    let sq = carrier.storedSquadrons[sqIdx];
    if (!sq || sq.count <= 0) return;

    sq.count--;

    //create squadron at carrier position, launching state
    let template = AIRCRAFT_TEMPLATES[sq.type];
    let spawnPos = [
        carrier.positionXY[0] + carrier.orientationDir[0] * 50,
        carrier.positionXY[1] + carrier.orientationDir[1] * 50,
        50 //low altitude during launch
    ];
    let ac = new Aircraft(carrier.team, carrier.faction, sq.type, spawnPos,
                         carrier.orientationDir, template.maxHealth, carrier);
    ac.state = 'launching';
    ac.launchProgress = 0;

    //add to active agents
    game.activeAgents[carrier.team][carrier.faction].aircraft.push(ac);
    updateBottomPanel();
}

function returnToArmBombs() {
    //return to carrier and set flag to arm when landing
    for (let unit of input.selectedAgents) {
        if (unit.aircraftType && unit.homeCarrier) {
            unit.state = 'returning';
            unit.armOnLanding = true;
        }
    }
    updateBottomPanel();
}

function setBombingMode() {
    //next right-click will set bomb target
    for (let unit of input.selectedAgents) {
        if (unit.aircraftType && unit.armed && unit.bombs > 0) {
            unit.state = 'bombing';
        }
    }
}

function returnToCarrier() {
    for (let unit of input.selectedAgents) {
        if (unit.aircraftType && unit.homeCarrier) {
            unit.state = 'returning';
            unit.armOnLanding = false;
        }
    }
    updateBottomPanel();
}

function setManualTorpedoMode() {
    //flag ships for manual torpedo fire on next right-click
    for (let unit of input.selectedAgents) {
        if (unit.shipType && unit.torpedoCount > 0) {
            unit.manualTorpedoMode = true;
        }
    }
    updateBottomPanel();
}

function fireManualTorpedo(ship, target) {
    if (ship.torpedoCount <= 0) return;
    //find an active torpedo mount
    for (let hpName in ship.hitpoints) {
        let hp = ship.hitpoints[hpName];
        if (hp.type === 'torpedoMount' && !hp.destroyed) {
            let hpXY = getHitpointWorldPos(ship, hp);
            playSound('splash', hpXY);
            let dir = normalize([target.positionXY[0] - hpXY[0], target.positionXY[1] - hpXY[1]]);
            let speed = HITPOINT_TYPES.torpedoMount.projectileSpeed;
            game.activeProjectiles.push({
                id: randomId(), positionXY: [...hpXY],
                velocityXY: [dir[0] * speed, dir[1] * speed],
                destinationXY: [...target.positionXY],
                damage: HITPOINT_TYPES.torpedoMount.damage,
                sourceTeam: ship.team, type: 'torpedo', targetShip: target
            });
            ship.torpedoCount--;
            updateBottomPanel();
            return;
        }
    }
}

// === INITIALIZATION ===

window.onload = async function() {
    //load aircraft images (non-blocking, fallback to triangles if fail)
    loadAllImages().catch(() => console.log('Some aircraft images failed to load'));

    if (loadPlayerIdentity()) {
        document.getElementById('loginPopup').classList.add('hidden');
        game.phase = 'menu';
        showMenu();
    }
};




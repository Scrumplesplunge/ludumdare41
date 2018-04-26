const CEILING_COLOR = "#7e756e";
const DELTA_TIME = 0.02;
const ENEMY_ATTACK_DISTANCE = 0.8;
const ENEMY_FOLLOW_RANGE = 8;
const ENEMY_SPEED = 1.5;
const FLOOR_COLOR = "#3a3633";
const FOG_COLOR = "#000000";
const FOG_DISTANCE = 5;
const FOV = 90 * Math.PI / 180;
const HEIGHT = 108;
const INITIAL_MAX_HEALTH = 3;
const INTERACT_DISTANCE = 1;
const ITEM_COLLECT_DISTANCE = 0.5;
const KNOCKBACK_DISTANCE = 0.25;
const MOUSE_SENSITIVITY = 0.005;
const MOVE_SPEED = 3;
const PLAYER_RADIUS = 0.25;
const SCALE = 5;
const TURN_SPEED = 5;
const WALL_HEIGHT = 0.5;
const WEAPON_SCALE = 4;
const WIDTH = 192;

const Suit = {
  clubs: "%",
  diamonds: "$",
  hearts: "#",
  spades: "&",
};

let weaponImages;
const Weapon = {
  fist: {
    range: 1,
    sweep: 1,
    damage: 1,
    image: () => weaponImages.get(inputs.get("ATTACK") ? "punch" : "fist"),
    hitSound: "punch",
  },
  dagger: {
    range: 1,
    sweep: 0.5,
    damage: 2,
    image: () => weaponImages.get(inputs.get("ATTACK") ? "stab" : "dagger"),
    hitSound: "punch",
  },
  pistol: {
    range: 2 * FOG_DISTANCE,
    sweep: 0.1,
    damage: 1,
    image: () => weaponImages.get(
        inputs.get("ATTACK") ? "pistol_fired" : "pistol"),
    attackSound: "shoot",
    hitSound: "punch",
  },
};
const weapons = [  // This is the order that weapons are acquired.
  Weapon.fist,
  Weapon.dagger,
  Weapon.pistol,
];

const startTime = Date.now();
const canvas = document.getElementById("display");
const context = canvas.getContext("2d");
const items = [];
const enemies = [];
const playerSpawn = {x: 0, y: 0};
const player = {
  health: INITIAL_MAX_HEALTH,
  maxHealth: INITIAL_MAX_HEALTH,
  x: 0, y: 0, angle: 0,
  targetBlock: null,  // Target block for interactions.
  targetEnemy: null,  // Target enemy for attacks.
  weapon: 0,  // Index into weapons.
};
const solitaire = {
  win: false,
  blocks: new Map,
  // Numeric value of the highest card placed on each suit stack.
  hearts: 0,
  clubs: 0,
  diamonds: 0,
  spades: 0,
  // Working stacks, each corresponding to a working stack block. Each working
  // stack is an array of card names which have alternating colours and descend
  // in value consecutively.
  stacks: [[], [], [], []],
  // Player inventory stack. This is a working stack which ascends in value
  // rather than descending, but must still alternate in colour.
  playerStack: [],
};
// Map from "x,y" to {image, primaryAction, secondaryAction}.
const walls = new Map;
let fontImage;
const fontMap = new Map;  // Map from colour to font image.
let music;  // Music audio handle.

const controlMap = new Map([
  ["TURN_LEFT", "ArrowLeft"],
  ["TURN_RIGHT", "ArrowRight"],
  ["FORWARDS", "KeyW"],
  ["BACKWARDS", "KeyS"],
  ["STRAFE_LEFT", "KeyA"],
  ["STRAFE_RIGHT", "KeyD"],
  ["PRIMARY_INTERACT", "KeyR"],
  ["SECONDARY_INTERACT", "KeyF"],
  ["DROP", "KeyX"],
  ["ATTACK", "Space"],
  ["MUSIC", "KeyM"],
  ["HELP", "KeyH"],
]);
const keyMap = new Map([...controlMap].map(([i, k]) => [k, i]));
const inputs = new Map([...controlMap].map(([i, k]) => [i, 0]));

const levelColorMap = new Map([
  ["#ffffff", "floor:"],
  ["#888888", "wall:white_wall_right"],
  ["#000000", "wall:brick"],
  ["#0088ff", "object:player"],
  ["#ffff00", "instance:star"],
  ["#008800", "instance:enemy"],
  ["#00ffff", "instance:health"],
  ["#8800ff", "instance:attack"],
  ["#ff0000", "solitaire:diamonds"],
  ["#00ff00", "solitaire:clubs"],
  ["#0000ff", "solitaire:hearts"],
  ["#ff8800", "solitaire:spades"],
  ["#ff0088", "solitaire:stack0"],
  ["#88ff00", "solitaire:stack1"],
  ["#00ff88", "solitaire:stack2"],
  ["#ff00ff", "solitaire:stack3"],
]);

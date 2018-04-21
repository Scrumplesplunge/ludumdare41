const CEILING_COLOR = "#7e756e";
const DELTA_TIME = 0.02;
const FLOOR_COLOR = "#3a3633";
const FOG_COLOR = "#000000";
const FOG_DISTANCE = 5;
const FOV = 90 * Math.PI / 180;
const HEIGHT = 108;
const MOVE_SPEED = 3;
const PLAYER_RADIUS = 0.25;
const SCALE = 5;
const TURN_SPEED = 5;
const WALL_HEIGHT = 0.5;
const WIDTH = 192;

const CLUBS = "%";
const DIAMONDS = "$";
const HEARTS = "#";
const SPADES = "&";

const startTime = Date.now();
const canvas = document.getElementById("display");
const context = canvas.getContext("2d");
const objects = [];
const player = {
  x: 0, y: 0, angle: 0,
  cards: [
    "K#",
    "Q&",
    "J#",
    "10&",
    "9#",
    "8&",
    "7#",
    "6&",
    "5#",
    "4&",
    "3#",
    "2&",
    "A#",
  ],
};
const walls = new Map;  // Map from "x,y" to material.
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
  ["INTERACT", "KeyE"],
  ["FIRE", "Space"],
  ["TOGGLE:MUSIC", "KeyM"],
  ["HELP", "KeyH"],
]);
const keyMap = new Map([...controlMap].map(([i, k]) => [k, i]));
const inputs = new Map([...controlMap].map(([i, k]) => [i, 0]));

const levelColorMap = new Map([
  ["#ffffff", "floor:"],
  ["#ff0000", "wall:diamonds"],
  ["#00ff00", "wall:clubs"],
  ["#0000ff", "wall:hearts"],
  ["#ff8800", "wall:spades"],
  ["#888888", "wall:end_brick"],
  ["#000000", "wall:brick"],
  ["#0088ff", "object:player"],
  ["#ffff00", "instance:star"],
  ["#008800", "instance:enemy"],
  ["#00ffff", "instance:health"],
  ["#8800ff", "instance:attack"],
  ["#ff00ff", "wall:stack"],
]);

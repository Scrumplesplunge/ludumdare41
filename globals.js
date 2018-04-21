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

const canvas = document.getElementById("display");
const context = canvas.getContext("2d");
const walls = new Map;  // Map from "x,y" to block material.
const player = {x: 0, y: 0, angle: 0};

const controlMap = new Map([
  ["TURN_LEFT", "ArrowLeft"],
  ["TURN_RIGHT", "ArrowRight"],
  ["FORWARDS", "KeyW"],
  ["BACKWARDS", "KeyS"],
  ["STRAFE_LEFT", "KeyA"],
  ["STRAFE_RIGHT", "KeyD"],
  ["INTERACT", "KeyE"],
  ["FIRE", "Space"],
]);
const keyMap = new Map([...controlMap].map(([i, k]) => [k, i]));
const inputs = new Map([...controlMap].map(([i, k]) => [i, 0]));

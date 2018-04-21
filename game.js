const CEILING_COLOR = "#7e756e";
const DELTA_TIME = 0.02;
const FLOOR_COLOR = "#3a3633";
const FOG_COLOR = "#000000";
const FOG_DISTANCE = 5;
const FOV = 90 * Math.PI / 180;
const HEIGHT = 108;
const MOVE_SPEED = 3;
const SCALE = 5;
const TURN_SPEED = 5;
const WALL_HEIGHT = 0.5;
const WIDTH = 192;

const canvas = document.getElementById("display");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
const context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;

// Automatically resize and position the canvas in the centre of the window.
function resize() {
  var aspect = WIDTH / HEIGHT;
  var heightIfFullWidth = window.innerWidth / aspect;
  var widthIfFullHeight = window.innerHeight * aspect;
  if (heightIfFullWidth <= window.innerHeight) {
    // Canvas is full-width, possibly with unused space above and below.
    var unusedRows = window.innerHeight - heightIfFullWidth;
    canvas.style.top = 0.5 * unusedRows + "px";
    canvas.style.left = "0px";
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = heightIfFullWidth + "px";
  } else {
    // Canvas is full-height, possibly with unused space to the left and right.
    var unusedColumns = window.innerWidth - widthIfFullHeight;
    canvas.style.top = "0px";
    canvas.style.left = 0.5 * unusedColumns + "px";
    canvas.style.width = widthIfFullHeight + "px";
    canvas.style.height = window.innerHeight + "px";
  }
}
resize();
window.addEventListener("resize", resize);

// Asynchronously load an image file.
function loadImage(name) {
  return new Promise((resolve, reject) => {
    var image = new Image;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = name;
  });
}

// Extract image data from an image.
function getImageData(image) {
  // We need the image to be on a canvas to extract the image data.
  var canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  var context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

function delay(seconds) {
  return new Promise((resolve, reject) => setTimeout(resolve, 1000 * seconds));
}

function* walkRay(x, y, angle) {
  var directionX = Math.cos(angle);
  var directionY = Math.sin(angle);
  var distance = 0;
  var iterCount = 0;
  var cellX = directionX >= 0 ? Math.floor(x) : Math.ceil(x - 1);
  var cellY = directionY >= 0 ? Math.floor(y) : Math.ceil(y - 1);
  while (distance < FOG_DISTANCE) {
    if (++iterCount == 200) throw new Error("balls");
    // next?Edge is the next point along coordinate ? where the ray could hit.
    // The coordinates are independent, this isn't the actual cell yet.
    var nextXEdge = directionX >= 0 ? cellX + 1 : cellX;
    var nextYEdge = directionY >= 0 ? cellY + 1 : cellY;
    // next?Cell is the cell that would be hit at next?Edge.
    var nextXCell = directionX >= 0 ? cellX + 1 : cellX - 1;
    var nextYCell = directionY >= 0 ? cellY + 1 : cellY - 1;
    // Now we want to compute the distance along the line that we have to travel
    // before hitting either the next X or next Y boundary. Normally we would
    // have to deal with the 0 case specially to avoid dividing by it but
    // JavaScript conveniently gives us Infinity in this case, which works fine
    // for our purposes.
    var dx = nextXEdge - x, dy = nextYEdge - y;
    var distanceUntilXEdge = dx / directionX,
        distanceUntilYEdge = dy / directionY;
    if (distanceUntilXEdge < distanceUntilYEdge) {
      distance += distanceUntilXEdge;
      x = nextXEdge;
      y += distanceUntilXEdge * directionY;
      cellX = nextXCell;
      yield {distance, cell: {x: cellX, y: cellY}, hit: {x, y}};
    } else {
      distance += distanceUntilYEdge;
      y = nextYEdge;
      x += distanceUntilYEdge * directionX;
      cellY = nextYCell;
      yield {distance, cell: {x: cellX, y: cellY}, hit: {x, y}};
    }
  }
}

function cast(walls, x, y, angle) {
  for (var {distance, cell, hit} of walkRay(x, y, angle)) {
    var id = cell.x + "," + cell.y;
    if (walls.has(id)) return {distance, material: walls.get(id), cell, hit};
  }
  return {distance: FOG_DISTANCE};
}

function computeTextureColumn(cell, hit) {
  var centerX = cell.x + 0.5;
  var centerY = cell.y + 0.5;
  var dx = hit.x - centerX;
  var dy = hit.y - centerY;
  // First we establish which quadrant (see diagram) the hitpoint is in. This
  // tells us which side of the square we are working with, which allows us to
  // use one of the coordinates to compute the texture column.
  //
  //  +-----+  --> Increasing x
  //  |\ 4 /|
  //  | \ / |
  //  |3 X 1|
  //  | / \ |
  //  |/ 2 \|
  //  +-----+
  //
  //  | Increasing y
  //  v
  if (dx + dy < 0) {
    return dx - dy < 0 ? 1 - (hit.y - cell.y)  // Quadrant 1
                       : hit.x - cell.x;  // Quadrant 2
  } else {
    return dx - dy > 0 ? hit.y - cell.y  // Quadrant 3
                       : 1 - (hit.x - cell.x);  // Quadrant 4
  }
}

function drawCeilingAndFloor() {
  var edgeX = Math.tan(0.5 * FOV);
  context.globalAlpha = 1;
  var yMid = Math.round(0.5 * HEIGHT);
  context.fillStyle = CEILING_COLOR;
  context.fillRect(0, 0, WIDTH, yMid);
  context.fillStyle = FLOOR_COLOR;
  context.fillRect(0, yMid, WIDTH, HEIGHT - yMid);
  context.fillStyle = FOG_COLOR;
  for (var y = 0; y < yMid; y++) {
    var lerp = 1 - y / yMid;
    context.globalAlpha = 1 / (0.8 + lerp);
    context.fillRect(0, y, WIDTH, 1);
    context.fillRect(0, HEIGHT - y - 1, WIDTH, 1);
  }
}

function drawWalls(walls, x, y, angle) {
  // With focal distance 1, edgeX is how far left on the focal plane we can see.
  var edgeX = Math.tan(0.5 * FOV);
  var yMid = 0.5 * HEIGHT;
  context.fillStyle = FOG_COLOR;
  for (var i = 0; i < WIDTH; i++) {
    var screenAngle = Math.atan(edgeX * (2 * i / WIDTH - 1));
    var {distance, material, cell, hit} =
        cast(walls, x, y, angle + screenAngle);
    // Adjust the distance to correct distortion due to the screen being flat.
    var adjustedDistance = distance * Math.cos(screenAngle);
    // The height of the walls is determined in terms of the screen width rather
    // than the screen height to allow different aspect ratios without the scene
    // squashing. This way, the height is also tied to the field of view, so
    // things stay consistent.
    var height = Math.round(WALL_HEIGHT * WIDTH / adjustedDistance);
    var columnStart = Math.round(yMid - 0.5 * height);
    context.globalAlpha = 1;
    if (hit) {
      var rawColumn = computeTextureColumn(cell, hit);
      var scaledColumn = Math.floor(material.width * rawColumn);
      var textureColumn =
          Math.max(0, Math.min(material.width - 1, scaledColumn));
      context.drawImage(
          material,
          textureColumn, 0, 1, material.height,  // Texture bounds
          i, columnStart, 1, height);  // Screen bounds
      context.globalAlpha = distance / FOG_DISTANCE;
    }
    context.fillRect(i, columnStart, 1, height);  // Draw fog.
  }
}

function draw(walls, x, y, angle) {
  drawCeilingAndFloor();
  drawWalls(walls, x, y, angle)
}

var controlMap = new Map([
  ["TURN_LEFT", "ArrowLeft"],
  ["TURN_RIGHT", "ArrowRight"],
  ["FORWARDS", "KeyW"],
  ["BACKWARDS", "KeyS"],
  ["STRAFE_LEFT", "KeyA"],
  ["STRAFE_RIGHT", "KeyD"],
  ["INTERACT", "KeyE"],
  ["FIRE", "Space"],
]);
var keyMap = new Map;
for (var [input, key] of controlMap) keyMap.set(key, input);

var inputs = new Map;
for (var [input, key] of controlMap) inputs.set(input, 0);
function handleKeyCode(code, state) {
  if (!keyMap.has(event.code)) return;
  var input = keyMap.get(event.code);
  inputs.set(input, state);
}
window.addEventListener("keydown", event => handleKeyCode(event.code, 1));
window.addEventListener("keyup", event => handleKeyCode(event.code, 0));

async function main() {
  var [levelImage, brick] =
      await Promise.all(["level.png", "brick.png"].map(loadImage));
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);
  var walls = new Map;  // Map from cell location to block texture.
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = 4 * (width * y + x);
      var r = imageData.data[i + 0],
          g = imageData.data[i + 1],
          b = imageData.data[i + 2];
      if (r == 255 && g == 255 && b == 255) continue;  // Floor
      var cell = x + "," + y;
      walls.set(cell, brick);
    }
  }
  var player = {x: 6, y: 8.5, angle: 0};
  while (true) {
    var forwardMove = inputs.get("FORWARDS") - inputs.get("BACKWARDS");
    var sideMove = inputs.get("STRAFE_RIGHT") - inputs.get("STRAFE_LEFT");
    var turn = inputs.get("TURN_RIGHT") - inputs.get("TURN_LEFT");
    player.angle += TURN_SPEED * turn * DELTA_TIME;
    var c = Math.cos(player.angle), s = Math.sin(player.angle);
    player.x += (c * forwardMove - s * sideMove) * MOVE_SPEED * DELTA_TIME;
    player.y += (s * forwardMove + c * sideMove) * MOVE_SPEED * DELTA_TIME;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    var angle = (Date.now() / 10000) % (2 * Math.PI);
    draw(walls, player.x, player.y, player.angle);
    await delay(DELTA_TIME);
  }
}

main();

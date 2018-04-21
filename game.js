const WIDTH = 800;
const HEIGHT = 600;
const SCALE = 1;
const FOG_DISTANCE = 10;

const canvas = document.getElementById("display");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
const context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;

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

var mouse = {x: 208, y: 272};
display.addEventListener("mousemove", event => {
  mouse.x = event.offsetX;
  mouse.y = event.offsetY;
});

function delay(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms));
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
      yield {distance, cell: {x: cellX, y: cellY}};
    } else {
      distance += distanceUntilYEdge;
      y = nextYEdge;
      x += distanceUntilYEdge * directionX;
      cellY = nextYCell;
      yield {distance, cell: {x: cellX, y: cellY}};
    }
  }
}

function cast(walls, x, y, angle) {
  for (var {distance, cell} of walkRay(x, y, angle)) {
    var id = cell.x + "," + cell.y;
    if (walls.has(id)) return {cell, distance};
  }
  return {cell: null, distance: FOG_DISTANCE};
}

async function main() {
  var levelImage = await loadImage("level.png");
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);
  var walls = new Set;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = 4 * (width * y + x);
      var r = imageData.data[i + 0],
          g = imageData.data[i + 1],
          b = imageData.data[i + 2];
      if (r == 255 && g == 255 && b == 255) continue;  // Floor
      var cell = x + "," + y;
      walls.add(cell);
    }
  }
  var scale = 20;
  while (true) {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.drawImage(levelImage, 0, 0, scale * width, scale * height);
    context.fillStyle = "#ff0000";
    context.fillRect(mouse.x - 2, mouse.y - 2, 4, 4);
    var worldX = mouse.x / scale;
    var worldY = mouse.y / scale;
    context.strokeStyle = "#ff0000";
    context.beginPath();
    for (var i = 0; i < 16; i++) {
      var angle = 2 * Math.PI * i / 16;
      var c = Math.cos(angle), s = Math.sin(angle);
      var {distance} = cast(walls, worldX, worldY, angle);
      context.moveTo(scale * worldX, scale * worldY);
      context.lineTo(scale * (worldX + distance * c),
                     scale * (worldY + distance * s));
    }
    context.stroke();
    await delay(50);
  }
}

main();

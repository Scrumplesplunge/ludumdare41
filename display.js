const edgeX = Math.tan(0.5 * FOV);
const yMid = Math.round(0.5 * HEIGHT);
const wallDistances = [];

function angNorm(angle) {
  var pi = Math.PI, tau = 2 * Math.PI;
  return ((angle + pi) % tau + tau) % tau - pi;
}

function columnToScreenAngle(column) {
  return Math.atan(edgeX * (2 * column / WIDTH - 1));
}

function screenAngleToColumn(angle) {
  return (Math.tan(angle) / edgeX + 1) * WIDTH / 2;
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

function cast(x, y, angle) {
  for (var {distance, cell, hit} of walkRay(x, y, angle)) {
    var id = cell.x + "," + cell.y;
    if (walls.has(id))
      return {distance, block: walls.get(id), cell, hit};
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
    return dx - dy < 0 ? hit.y - cell.y  // Quadrant 1
                       : 1 - (hit.x - cell.x);  // Quadrant 2
  } else {
    return dx - dy > 0 ? 1 - (hit.y - cell.y)  // Quadrant 3
                       : hit.x - cell.x;  // Quadrant 4
  }
}

function drawCeilingAndFloor() {
  context.globalAlpha = 1;
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

function drawWalls(x, y, angle) {
  // With focal distance 1, edgeX is how far left on the focal plane we can see.
  context.fillStyle = FOG_COLOR;
  for (var i = 0; i < WIDTH; i++) {
    var screenAngle = columnToScreenAngle(i);
    var {distance, block, cell, hit} = cast(x, y, angle + screenAngle);
    wallDistances[i] = distance;
    // Adjust the distance to correct distortion due to the screen being flat.
    var adjustedDistance = distance * Math.cos(screenAngle);
    // The height of the walls is determined in terms of the screen width rather
    // than the screen height to allow different aspect ratios without the scene
    // squashing. This way, the height is also tied to the field of view, so
    // things stay consistent.
    var height = Math.round(WALL_HEIGHT * WIDTH / edgeX / adjustedDistance);
    var columnStart = Math.round(yMid - 0.5 * height);
    context.globalAlpha = 1;
    if (hit) {
      var rawColumn = computeTextureColumn(cell, hit);
      var scaledColumn = Math.floor(block.image.width * rawColumn);
      var textureColumn =
          Math.max(0, Math.min(block.image.width - 1, scaledColumn));
      context.drawImage(
          block.image,
          textureColumn, 0, 1, block.image.height,  // Texture bounds
          i, columnStart, 1, height);  // Screen bounds
      context.globalAlpha = distance / FOG_DISTANCE;
    }
    context.fillRect(i, columnStart, 1, height);  // Draw fog.
  }
}

var spriteCanvas = document.createElement("canvas");
var spriteContext = spriteCanvas.getContext("2d");
function drawObjects(x, y, angle) {
  // Filter down to sprites which are in front of the player and sort them from
  // furthest to nearest.
  var c = Math.cos(angle), s = Math.sin(angle);
  function distance(sprite) {
    var dx = sprite.x - x, dy = sprite.y - y;
    return c * dx + s * dy;
  }
  function inViewingRange(s) {
    var d = distance(s);
    return PLAYER_RADIUS < d && d < FOG_DISTANCE;
  }
  context.globalAlpha = 1;
  // Remove any items or enemies that are marked to be removed.
  for (var i = 0, j = 0, n = items.length; i < n; i++)
    if (!items[i].removed) items[j++] = items[i];
  items.splice(j);
  for (var i = 0, j = 0, n = enemies.length; i < n; i++)
    if (!enemies[i].removed) enemies[j++] = enemies[i];
  enemies.splice(j);
  var itemSprites = items.map(({image, x, y, phaseOffset}) => {
    var phase = (0.01 * Date.now() + phaseOffset) % (2 * Math.PI);
    var verticalOffset = 0.01 * Math.sin(phase);
    return {image, x, y, width: 0.25, height: 0.25, verticalOffset};
  });
  var enemySprites = enemies.map(({image, x, y, moving, phaseOffset}) => {
    var verticalOffset = 0.1;
    if (moving) {
      var phase = (0.01 * Date.now() + phaseOffset) % (2 * Math.PI);
      verticalOffset -= Math.abs(0.03 * Math.sin(phase));
    }
    return {image, x, y, width: 0.25, height: 0.4, verticalOffset};
  });
  var sprites = [...itemSprites, ...enemySprites].filter(inViewingRange);
  sprites.sort((a, b) => distance(b) - distance(a));
  for (var sprite of sprites) {
    // Compute the on-screen dimensions of the sprite.
    var dx = sprite.x - x, dy = sprite.y - y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var screenAngle = angNorm(Math.atan2(dy, dx) - angle);
    var adjustedDistance = distance * Math.cos(screenAngle);
    var column = screenAngleToColumn(screenAngle);
    var width = Math.round(sprite.width * WIDTH / edgeX / adjustedDistance);
    var height = Math.round(sprite.height * WIDTH / edgeX / adjustedDistance);
    var verticalOffset =
        sprite.verticalOffset === undefined ? 0 : sprite.verticalOffset;
    var offset = verticalOffset * WIDTH / edgeX / adjustedDistance;
    var xMin = Math.round(column - 0.5 * width);
    var yMin = Math.round(yMid - 0.5 * height + offset);
    // Render the sprite to the offscreen canvas.
    if (spriteCanvas.width < width) spriteCanvas.width = width;
    if (spriteCanvas.height < height) spriteCanvas.height = height;
    spriteContext.imageSmoothingEnabled = false;
    // Draw the sprite and overlay shading for the fog.
    spriteContext.globalAlpha = 1;
    spriteContext.globalCompositeOperation = "source-over";
    spriteContext.clearRect(0, 0, width, height);
    spriteContext.drawImage(sprite.image, 0, 0, width, height);
    spriteContext.fillStyle = FOG_COLOR;
    spriteContext.globalAlpha = distance / FOG_DISTANCE;
    spriteContext.globalCompositeOperation = "source-atop";
    spriteContext.fillRect(0, 0, width, height);
    // Copy the sprite to the display, using wallDistance[] as a z-buffer.
    for (var sx = 0; sx < width; sx++) {
      if (wallDistances[xMin + sx] < distance) continue;
      context.drawImage(
          spriteCanvas,
          sx, 0, 1, height,  // Sprite bounds.
          xMin + sx, yMin, 1, height);  // Display bounds.
    }
  }
}

function getStyledFont(style) {
  if (fontMap.has(style)) return fontMap.get(style);
  var canvas = document.createElement("canvas");
  canvas.width = fontImage.width;
  canvas.height = fontImage.height;
  var context = canvas.getContext("2d");
  context.fillStyle = style;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(fontImage, 0, 0);
  fontMap.set(style, canvas);
  return canvas;
}

function rawMeasureText(message) { return 6 * message.length; }

function rawText(context, x, y, style, message) {
  var message = message.toUpperCase();
  var font = getStyledFont(style);
  for (var i = 0, n = message.length; i < n; i++) {
    var c = message.charCodeAt(i);
    if (c < 32 || 96 <= c) c = "?".charCodeAt(0);
    var fromX = 6 * ((c - 32) % 16);
    var fromY = 6 * ((c - 32) >> 4);
    var toX = x + 6 * i;
    context.drawImage(font, fromX, fromY, 6, 6, toX, y, 6, 6);
  }
  return x + rawMeasureText(message);
}

function measureText(...parts) {
  var length = 0;
  for (var part of parts) {
    if (part instanceof Array) continue;
    length += rawMeasureText(part);
  }
  return length;
}

function text(context, x, y, ...parts) {
  var font = "#ffffff";
  for (var part of parts) {
    if (part instanceof Array) {
      font = part[0];
    } else {
      x = rawText(context, x, y, font, part.toString());
    }
  }
  return x;
}

function drawWorld(x, y, angle) {
  drawCeilingAndFloor();
  drawWalls(x, y, angle)
  drawObjects(x, y, angle);
}

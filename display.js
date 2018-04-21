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

function drawWalls(x, y, angle) {
  // With focal distance 1, edgeX is how far left on the focal plane we can see.
  var edgeX = Math.tan(0.5 * FOV);
  var yMid = 0.5 * HEIGHT;
  context.fillStyle = FOG_COLOR;
  for (var i = 0; i < WIDTH; i++) {
    var screenAngle = Math.atan(edgeX * (2 * i / WIDTH - 1));
    var {distance, material, cell, hit} = cast(x, y, angle + screenAngle);
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

function draw(x, y, angle) {
  drawCeilingAndFloor();
  drawWalls(x, y, angle)
}

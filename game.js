canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
context.imageSmoothingEnabled = false;

function updatePlayer() {
  // Move the player based on inputs.
  var forwardMove = inputs.get("FORWARDS") - inputs.get("BACKWARDS");
  var sideMove = inputs.get("STRAFE_RIGHT") - inputs.get("STRAFE_LEFT");
  var turn = inputs.get("TURN_RIGHT") - inputs.get("TURN_LEFT");
  player.angle += TURN_SPEED * turn * DELTA_TIME;
  var c = Math.cos(player.angle), s = Math.sin(player.angle);
  var dx = (c * forwardMove - s * sideMove) * MOVE_SPEED * DELTA_TIME;
  var dy = (s * forwardMove + c * sideMove) * MOVE_SPEED * DELTA_TIME;
  player.x += dx;
  player.y += dy;
  // Correct the player location if they are intersecting with any walls.
  var cellX = Math.floor(player.x);
  var cellY = Math.floor(player.y);
  if (dx < 0 && walls.has((cellX - 1) + "," + cellY)) {
    player.x = Math.max(player.x, cellX + PLAYER_RADIUS);
  } else if (dx > 0 && walls.has((cellX + 1) + "," + cellY)) {
    player.x = Math.min(player.x, cellX + 1 - PLAYER_RADIUS);
  }
  if (dy < 0 && walls.has(cellX + "," + (cellY - 1))) {
    player.y = Math.max(player.y, cellY + PLAYER_RADIUS);
  } else if (dy > 0 && walls.has(cellX + "," + (cellY + 1))) {
    player.y = Math.min(player.y, cellY + 1 - PLAYER_RADIUS);
  }
}

async function main() {
  var [levelImage, brick, star] =
      await Promise.all(["level.png", "brick.png", "star.png"].map(loadImage));
  // Load the level layout.
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);
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
  // Place a few objects.
  objects.push({image: star, width: 0.25, height: 0.25, x: 6, y: 8.5});
  // Position the player.
  player.x = 6;
  player.y = 8.5;
  while (true) {
    updatePlayer();
    context.clearRect(0, 0, WIDTH, HEIGHT);
    var angle = (Date.now() / 10000) % (2 * Math.PI);
    draw(player.x, player.y, player.angle);
    await delay(DELTA_TIME);
  }
}

main();

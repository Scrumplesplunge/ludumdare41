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

const startTime = Date.now();
async function main() {
  var [
    brick,
    clubs,
    diamonds,
    endBrick,
    font,
    hearts,
    levelImage,
    spades,
    star,
  ] = await Promise.all([
    "brick.png",
    "clubs.png",
    "diamonds.png",
    "end_brick.png",
    "font.png",
    "hearts.png",
    "level.png",
    "spades.png",
    "star.png",
  ].map(loadImage));
  fontImage = font;
  // Load the level layout.
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var color = colorAt(imageData.data, 4 * (width * y + x));
      var cell = x + "," + y;
      switch (color) {
        case "#ff0000": walls.set(cell, diamonds); break;
        case "#00ff00": walls.set(cell, clubs); break;
        case "#0000ff": walls.set(cell, hearts); break;
        case "#ff8800": walls.set(cell, spades); break;
        case "#888888": walls.set(cell, endBrick); break;
        case "#000000": walls.set(cell, brick); break;
        case "#0088ff": player.x = x; player.y = y; break;
      }
    }
  }
  while (true) {
    star.verticalOffset = 0.01 * Math.sin((0.01 * Date.now()) % (2 * Math.PI));
    updatePlayer();
    context.clearRect(0, 0, WIDTH, HEIGHT);
    draw(player.x, player.y, player.angle);
    var timeTaken = (Date.now() - startTime) / 1000;
    var minutes = (timeTaken / 60 | 0), seconds = timeTaken % 60 | 0;
    text(2, 2, "Time: ", ["#ffff00"], minutes, ":",
         seconds.toString().padStart(2, "0"));
    // Format the player's card list.
    var [first, ...rest] = player.cards.map(card => [[cardColor(card)], card]);
    text(2, HEIGHT - 8,
         ["#ffffff"], "[", ...first, ["#ffffff"], "]",
         ...[].concat(...rest));
    await delay(DELTA_TIME);
  }
}

main();

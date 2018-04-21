canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
context.imageSmoothingEnabled = false;

async function main() {
  var [levelImage, brick] =
      await Promise.all(["level.png", "brick.png"].map(loadImage));
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
  player.x = 6;
  player.y = 8.5;
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
    draw(player.x, player.y, player.angle);
    await delay(DELTA_TIME);
  }
}

main();

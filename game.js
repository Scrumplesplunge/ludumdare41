canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
context.imageSmoothingEnabled = false;

async function loadFont() {
  fontImage = await loadImage("font.png");
}

async function loadMusic() {
  music = await loadSound("music.ogg");
  music.loop = true;
  // Set the music to 0 volume - the game loop will overwrite this soon but
  // defaulting to 0 rather than 1 saves us from getting a very loud noise for
  // a brief instant before a better volume is set.
  music.volume = 0;
  music.play();
  inputs.set("TOGGLE:MUSIC", 1);  // Music toggle is default-enabled.
}

async function loadWallImages() {
  return new Map(await Promise.all([
    "brick",
    "clubs",
    "diamonds",
    "end_brick",
    "hearts",
    "spades",
  ].map(async (name) => [name, await loadImage(name + ".png")])));
}

async function loadLevel(name) {
  let [levelImage, starImage, wallImages] = await Promise.all([
    loadImage("level.png"),
    loadImage("star.png"),
    loadWallImages(),
  ]);
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);

  var objectInitializers = new Map([
    ["player", (x, y) => { player.x = x; player.y = y; }],
  ]);

  function makeStar(x, y) {
    return {
      image: starImage,
      width: 0.25,
      height: 0.25,
      x, y,
    };
  }

  var instancers = new Map([
    ["star", (x, y) => objects.push(makeStar(x, y))],
  ]);

  walls.clear();
  objects.splice(0, objects.length);
  var objectIds = new Set;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var color = colorAt(imageData.data, 4 * (width * y + x));
      var cell = x + "," + y;
      if (!levelColorMap.has(color))
        throw new Error("Unregistered color: " + color);
      let [type, id] = levelColorMap.get(color).split(":");
      switch (type) {
        case "floor":
          break;
        case "wall":
          walls.set(cell, wallImages.get(id));
          break;
        case "object":
          if (objectIds.has(id))
            throw new Error("Duplicate object: " + id);
          objectIds.add(id);
          if (!objectInitializers.has(id))
            throw new Error("Unknown object type: " + id);
          objectInitializers.get(id)(x, y);
          break;
        case "instance":
          if (!instancers.has(id))
            throw new Error("Unknown instance type: " + id);
          instancers.get(id)(x, y);
          break;
        default:
          throw new Error("Unhandled color type: " + type);
      }
    }
  }
}

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

function drawHelp() {
  var i = 0;
  for (var [input, key] of controlMap) {
    text(2, 2 + 8 * i, input + " = ", ["#ffff00"], key);
    i++;
  }
}

function drawHud() {
  // Display elapsed time.
  var timeTaken = (Date.now() - startTime) / 1000;
  var minutes = (timeTaken / 60 | 0), seconds = timeTaken % 60 | 0;
  text(2, 2, "Time: ", ["#ffff00"], minutes, ":",
       seconds.toString().padStart(2, "0"));
  // Display the music indicator.
  var musicMessage = [
    "Help (H) Music ",
    [inputs.get("TOGGLE:MUSIC") ? "#00ff00" : "#ff0000"],
    inputs.get("TOGGLE:MUSIC") ? "On" : "Off",
  ];
  text(WIDTH - 1 - measureText(...musicMessage), 2, ...musicMessage);
  // Format the player's card list.
  var cardList = [];
  if (player.cards.length == 0) {
    cardList = [["#ffffff"], "[", ["#888888"], "?", ["#ffffff"], "]"];
  } else {
    var [first, ...rest] = player.cards.map(card => [[cardColor(card)], card]);
    cardList =
        [["#ffffff"], "[", ...first, ["#ffffff"], "]", ...[].concat(...rest)];
  }
  text(2, HEIGHT - 8, ...cardList);
}

async function main() {
  await Promise.all([
    loadFont(),
    loadMusic(),
    loadLevel("level.png"),
  ]);
  while (true) {
    music.volume = inputs.get("TOGGLE:MUSIC") ? 0.2 : 0;
    updatePlayer();
    drawWorld(player.x, player.y, player.angle);
    inputs.get("HELP") ? drawHelp() : drawHud();
    await delay(DELTA_TIME);
  }
}

main();

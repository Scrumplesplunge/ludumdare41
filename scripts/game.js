canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
context.imageSmoothingEnabled = false;

// Firefox support for image-rendering: pixelated is not available yet, but
// optimizeSpeed works.
if (!canvas.style.imageRendering)
  canvas.style.imageRendering = "optimizeSpeed";

async function loadFont() {
  fontImage = await loadImage("font.png");
}

async function loadMusic() {
  // This list includes sounds which will be used later so that they don't need
  // to be fetched when they are first played.
  var [m, ...preloaded] = await Promise.all([
    "music.ogg",
    "get.ogg",
    "put.ogg",
    "collect.ogg",
    "punch.ogg",
    "enemy_attack.ogg",
    "enemy_death.ogg",
    "player_death.ogg",
    "shoot.ogg",
  ].map(loadSound));
  music = m;
  music.loop = true;
  music.volume = 0.2;
  music.play();
  onInput("MUSIC", 1, () => music.paused ? music.play() : music.pause());
}

async function loadWeaponImages() {
  weaponImages = await loadImages([
    "fist",
    "punch",
    "dagger",
    "stab",
    "pistol",
    "pistol_fired",
  ]);
}

var loadWallImages = () => loadImages([
  "brick",
  "stack",
  "white_wall_right",
]);

var loadSpriteImages = () => loadImages([
  "attack",
  "enemy",
  "health",
  "star",
]);

async function loadLevel(name) {
  let [levelImage, cardBackground, spriteImages, _, wallTextures] =
      await Promise.all([
    loadImage("level.png"),
    loadImage("card.png"),
    loadSpriteImages(),
    loadSolitaireBlockTextures(),
    loadWallImages(),
  ]);
  var width = levelImage.width, height = levelImage.height;
  var imageData = getImageData(levelImage);

  function setPlayerSpawn(x, y) {
    player.x = playerSpawn.x = x;
    player.y = playerSpawn.y = y;
  }

  var objectInitializers = new Map([["player", setPlayerSpawn]]);

  function collect(item) {
    switch (item.type) {
      case "attack":
        if (player.weapon == weapons.length - 1) return;
        player.weapon++;
        break;
      case "health":
        if (player.health == player.maxHealth) return;
        player.health = player.maxHealth;
        break;
      case "star":
        player.health++;
        player.maxHealth++;
        break;
      case "card":
        if (!playerCanTakeCard(item.card)) return;
        solitaire.playerStack.push(item.card);
        break;
      default:
        return;
    }
    playSound("collect");
    item.removed = true;
  }
  function item(x, y, type, image) {
    var item = {
      type: type,
      image: image,
      phaseOffset: 2 * Math.PI * Math.random(),
      x, y,
      onCollect: () => collect(item),
      removed: false,
    };
    return item;
  }
  function simpleItem(x, y, type) {
    return item(x, y, type, spriteImages.get(type));
  }
  function dropCard(x, y, card) {
    console.log("dropCard(" + x + ", " + y + ", " + card + ")");
    // Render the card image.
    var canvas = document.createElement("canvas");
    canvas.width = cardBackground.width;
    canvas.height = cardBackground.height;
    var context = canvas.getContext("2d");
    context.drawImage(cardBackground, 0, 0);
    text(context, 5, 8, [cardColor(card)], card);
    var cardItem = item(x, y, "card", canvas);
    cardItem.card = card;
    items.push(cardItem);
  }
  function makeEnemy(x, y) {
    var enemy = {
      image: spriteImages.get("enemy"),
      x, y,
      phaseOffset: 2 * Math.PI * Math.random(),
      moving: false,
      health: 2,
      nextAttack: 0,
      attackCooldown: 1000,
      onDeath: () => {
        if (deck.length == 0) return;
        dropCard(enemy.x, enemy.y, deck.pop());
      },
    };
    return enemy;
  }

  var instancers = new Map([
    ["attack", (x, y) => items.push(simpleItem(x, y, "attack"))],
    ["enemy", (x, y) => enemies.push(makeEnemy(x, y))],
    ["health", (x, y) => items.push(simpleItem(x, y, "health"))],
    ["star", (x, y) => items.push(simpleItem(x, y, "star"))],
  ]);

  walls.clear();
  items.splice(0, items.length);
  enemies.splice(0, enemies.length);
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
          walls.set(cell, {
            image: wallTextures.get(id),
            primaryAction: null,
            secondaryAction: null,
          });
          break;
        case "solitaire":
          walls.set(cell, makeSolitaireWall(id));
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
          instancers.get(id)(x + 0.5, y + 0.5);
          break;
        default:
          throw new Error("Unhandled color type: " + type);
      }
    }
  }

  onInput("PRIMARY_INTERACT", 1, () => {
    if (!player.targetBlock) return;
    var action = player.targetBlock.primaryAction;
    if (action && action.available()) {
      playSound("put");
      action.perform();
    }
  });

  onInput("SECONDARY_INTERACT", 1, () => {
    if (!player.targetBlock) return;
    var action = player.targetBlock.secondaryAction;
    if (action && action.available()) {
      playSound("get");
      action.perform();
    }
  });

  onInput("ATTACK", 1, () => {
    var weapon = weapons[player.weapon];
    if (weapon.attackSound) playSound(weapon.attackSound);
    var enemy = player.targetEnemy;
    if (enemy) {
      playSound(weapon.hitSound);
      enemy.health -= weapon.damage;
      // Knock back the enemy slightly, taking care not to put them inside
      // a wall.
      var dx = enemy.x - player.x, dy = enemy.y - player.y;
      var currentDistance = Math.sqrt(dx * dx + dy * dy);
      var {distance} = cast(player.x, player.y, player.angle);
      var knockbackDistance = Math.min(currentDistance + KNOCKBACK_DISTANCE,
                                       distance - PLAYER_RADIUS);
      var distanceRatio = knockbackDistance / currentDistance;
      enemy.x = player.x + dx * distanceRatio;
      enemy.y = player.y + dy * distanceRatio;
    }
  });

  onInput("DROP", 1, () => {
    if (solitaire.playerStack.length == 0) return;
    playSound("put");
    // Cast a ray to check that the card won't be dropped in a wall.
    var {distance} = cast(player.x, player.y, player.angle);
    var dropDistance =
        Math.min(ITEM_COLLECT_DISTANCE + 0.05, distance - PLAYER_RADIUS);
    var x = player.x + dropDistance * Math.cos(player.angle);
    var y = player.y + dropDistance * Math.sin(player.angle);
    debugger;
    dropCard(x, y, solitaire.playerStack.pop());
  });
}

function updatePlayer() {
  // Handle player death.
  if (player.health <= 0) {
    playSound("player_death");
    player.health = player.maxHealth = INITIAL_MAX_HEALTH;
    player.x = playerSpawn.x;
    player.y = playerSpawn.y;
    player.weapon = 0;
  }
  // Move the player based on inputs.
  var turn = inputs.get("TURN_RIGHT") - inputs.get("TURN_LEFT");
  player.angle += TURN_SPEED * turn * DELTA_TIME;
  var forwardMove = inputs.get("FORWARDS") - inputs.get("BACKWARDS");
  var sideMove = inputs.get("STRAFE_RIGHT") - inputs.get("STRAFE_LEFT");
  var moveLength = Math.sqrt(forwardMove * forwardMove + sideMove * sideMove);
  if (moveLength > 0) {
    forwardMove /= moveLength;
    sideMove /= moveLength;
  }
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
  // Set the target block if close enough to one.
  var {distance, block} = cast(player.x, player.y, player.angle);
  player.targetBlock = distance < INTERACT_DISTANCE ? block : null;
  var playerWeapon = weapons[player.weapon];
  // Set the target enemy if one is in range.
  function enemyDistance(enemy) {
    var dx = enemy.x - player.x, dy = enemy.y - player.y;
    var forwardDistance = c * dx + s * dy;
    var sideDistance = Math.abs(-s * dx + c * dy);
    if (sideDistance > playerWeapon.sweep) return Infinity;
    if (forwardDistance < 0) return Infinity;
    return forwardDistance;
  }
  var potentialTargets =
      enemies.map(e => [enemyDistance(e), e])
             .filter(([d, e]) => d < playerWeapon.range)
             .sort(([d1, e1], [d2, e2]) => d1 - d2)
             .map(([d, e]) => e);
  player.targetEnemy = potentialTargets.length > 0 ? potentialTargets[0] : null;
  // Collect any items near the player.
  for (var i = 0, n = items.length; i < n; i++) {
    var dx = items[i].x - player.x, dy = items[i].y - player.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < ITEM_COLLECT_DISTANCE) {
      items[i].onCollect();
    }
  }
}

function updateEnemies() {
  var now = Date.now();
  // Remove any dead enemies.
  for (var i = 0, j = 0, n = enemies.length; i < n; i++) {
    if (enemies[i].health > 0) {
      enemies[j++] = enemies[i];
    } else {
      playSound("enemy_death");
      enemies[i].onDeath();
    }
  }
  enemies.splice(j);
  for (var enemy of enemies) {
    var dx = player.x - enemy.x, dy = player.y - enemy.y;
    var playerDistance = Math.sqrt(dx * dx + dy * dy);
    // Only move towards the player if the player is close enough and there is a
    // clear line of sight.
    enemy.moving = false;
    if (playerDistance > ENEMY_FOLLOW_RANGE) continue;
    if (playerDistance > ENEMY_ATTACK_DISTANCE) {
      // Chase the player.
      var {distance, hit} =
          cast(enemy.x, enemy.y, Math.atan2(dy, dx), ENEMY_FOLLOW_RANGE);
      if (distance < playerDistance) continue;
      enemy.moving = true;
      enemy.x += ENEMY_SPEED * DELTA_TIME * dx / playerDistance;
      enemy.y += ENEMY_SPEED * DELTA_TIME * dy / playerDistance;
    } else if (now > enemy.nextAttack) {
      playSound("enemy_attack");
      player.health--;
      enemy.nextAttack = now + enemy.attackCooldown;
    }
  }
}

function drawHelp() {
  var i = 0;
  for (var [input, key] of controlMap) {
    text(context, 2, 2 + 8 * i, input + " = ", ["#ffff00"], key);
    i++;
  }
}

function drawHud() {
  // Show the player weapon.
  var image = weapons[player.weapon].image();
  var w = WEAPON_SCALE * image.width, h = WEAPON_SCALE * image.height;
  context.drawImage(image, WIDTH - w, HEIGHT - h, w, h);
  // Display elapsed time.
  var timeTaken = (Date.now() - startTime) / 1000;
  var minutes = (timeTaken / 60 | 0), seconds = timeTaken % 60 | 0;
  text(context, 2, 2, "Time: ", ["#ffff00"], minutes, ":",
       seconds.toString().padStart(2, "0"));
  // Display the music indicator.
  var musicMessage = [
    "Help (H) Music ",
    [music.paused ? "#ff0000" : "#00ff00"],
    music.paused ? "Off" : "On",
  ];
  text(context, WIDTH - 1 - measureText(...musicMessage), 2, ...musicMessage);
  // Format the player's card list.
  var nextCardIndicator = [];
  var stack = solitaire.playerStack;
  if (stack.length == 0) {
    // The player can pick up any card next.
    nextCardIndicator = [["#ffff00"], "??"];
  } else {
    var card = stack[stack.length - 1];
    var value = cardValue(card);
    if (value == 13) {
      // The player cannot pick up another card.
      nextCardIndicator = [["#888888"], "--"];
    } else {
      var color = cardColor(card);
      var nextColor = color == "#000000" ? "#ff0000" : "#000000";
      nextCardIndicator =
          [["#ffff00"], "A23456789\"JQK"[value], [nextColor], "?"];
    }
  }
  var end = text(context, 2, HEIGHT - 8, ["#ffffff"], "[", ...nextCardIndicator,
                 ["#ffffff"], "]");
  var cardInfo = stack.map(card => [[cardColor(card)], card]).reverse();
  text(context, end, HEIGHT - 8, ...[].concat(...cardInfo));
  // Show interaction options for the target block.
  if (player.targetBlock) {
    var block = player.targetBlock;
    function showInteractionMessage(action, key, y) {
      var available = action.available();
      var style = available ? "#ffff00" : "#888888";
      var message = "(" + key + ") " + action.description;
      var x = Math.floor(0.5 * (WIDTH - 6 * message.length));
      text(context, x, y, [style], message);
    }
    if (block.primaryAction) {
      showInteractionMessage(
          block.primaryAction, controlMap.get("PRIMARY_INTERACT"), HEIGHT - 23);
    }
    if (block.secondaryAction) {
      showInteractionMessage(block.secondaryAction,
                             controlMap.get("SECONDARY_INTERACT"), HEIGHT - 16);
    }
  }
  // Draw health.
  text(context, 5, HEIGHT - 16, ["#ff0000"], "#".repeat(player.health),
       ["#333333"], "#".repeat(player.maxHealth - player.health));
}

async function main() {
  await Promise.all([
    loadFont(),
    loadMusic(),
    loadWeaponImages(),
    loadLevel("level.png"),
  ]);
  while (!solitaire.win) {
    updateEnemies();
    updatePlayer();
    updateSolitaireSprites();
    drawWorld(player.x, player.y, player.angle);
    inputs.get("HELP") ? drawHelp() : drawHud();
    await delay(DELTA_TIME);
  }
  music.pause();
  music = playSound("win");
  context.globalAlpha = 0.8;
  context.fillStyle = "#000000";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.globalAlpha = 1;
  var message = "Thanks for playing :)";
  text(context, 0.5 * (WIDTH - 6 * message.length) | 0, HEIGHT / 2 + 10 | 0,
       message);
  context.scale(3, 3);
  text(context, 8, 15, "You Win!");
}

main();

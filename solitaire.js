var solitaireImages;
var workingStacks = [];

function card(suit, value) { return "A23456789\"JQK"[value - 1] + suit; }

function cardColor(card) {
  switch (card[1]) {
    case Suit.diamonds:
    case Suit.hearts:
      return "#ff0000";
    case Suit.clubs:
    case Suit.spades:
      return "#000000";
  }
}

function cardValue(card) {
  var valueString = card.slice(0, -1);
  switch (valueString) {
    case "A": return 1;
    case "\"": return 10;
    case "J": return 11;
    case "Q": return 12;
    case "K": return 13;
    default: return parseInt(valueString, 10);
  }
}

async function loadSolitaireImages() {
  solitaireImages = await loadImages([
    "clubs",
    "diamonds",
    "hearts",
    "spades",
    "white_wall_left",
    "white_wall_middle",
  ]);
}

// Create a canvas for each of the suits.
async function loadSolitaireBlockTextures() {
  await loadSolitaireImages();
  // Generate the textures for each suit.
  var suits = ["diamonds", "clubs", "hearts", "spades"];  // Wall order.
  for (var i = 0; i < 4; i++) {
    var icon = solitaireImages.get(suits[i]);
    var background =
        solitaireImages.get(i == 0 ? "white_wall_left" : "white_wall_middle");
    var canvas = document.createElement("canvas");
    canvas.width = background.width;
    canvas.height = background.height;
    var context = canvas.getContext("2d");
    solitaire.blocks.set(suits[i], {canvas, context, background, icon});
  }
  // Generate textures for each working stack.
  for (var i = 0, n = solitaire.stacks.length; i < n; i++) {
    var background =
        solitaireImages.get(i == 0 ? "white_wall_left" : "white_wall_middle");
    var canvas = document.createElement("canvas");
    canvas.width = 3 * background.width;
    canvas.height = 3 * background.height;
    var context = canvas.getContext("2d");
    solitaire.blocks.set("stack" + i, {canvas, context, background});
  }
}

function playerCanPut(place) {
  if (solitaire.playerStack.length == 0) return false;
  var card = solitaire.playerStack[solitaire.playerStack.length - 1];
  if (Suit.hasOwnProperty(place)) {
    return card[1] == Suit[place] && cardValue(card) == solitaire[place] + 1;
  }
  if (place.substr(0, 5) != "stack")
    throw new Error("Unknown place.");
  var stack = solitaire.stacks[parseInt(place.substr(5), 10)];
  if (stack.length == 0) return true;
  var stackTop = stack[stack.length - 1];
  return cardColor(card) != cardColor(stackTop) &&
         cardValue(card) == cardValue(stackTop) - 1;
}

function playerPut(place) {
  if (!playerCanPut(place)) throw new Error("Called put when not allowed.");
  var card = solitaire.playerStack.pop();
  if (Suit.hasOwnProperty(place)) {
    solitaire[place] = cardValue(card);
  } else {
    var stack = solitaire.stacks[parseInt(place.substr(5), 10)];
    stack.push(card);
  }
}

function makeSolitaireWall(place) {
  return {
    image: solitaire.blocks.get(place).canvas,
    primaryAction: {
      description: "Place card",
      available: () => playerCanPut(place),
      perform: () => playerPut(place),
    },
    secondaryAction: null,
  };
}

function updateSolitaireSprites() {
  // Update the suit blocks.
  for (var suit of ["clubs", "diamonds", "hearts", "spades"]) {
    var {canvas, context, background, icon} = solitaire.blocks.get(suit);
    context.drawImage(background, 0, 0);
    context.drawImage(icon, 7, 7);
    var stackValue = solitaire[suit];
    if (stackValue == 0) continue;
    text(context, 8, 1, ["#888888"], "A23456789\"JQK"[stackValue - 1]);
  }
  // Update the working stacks.
  for (var i = 0, n = solitaire.stacks.length; i < n; i++) {
    var {canvas, context, background} = solitaire.blocks.get("stack" + i);
    context.imageSmoothingEnabled = false;
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    var stack = solitaire.stacks[i];
    for (var j = 0, m = stack.length; j < 13; j++) {
      var valueString = j < m ? stack[j][0] : " ";
      var suitString = j < m ? stack[j][1] : "?";
      var style = j < m ? cardColor(stack[j]) : "#EEEEEE";
      var message = j % 2 ? suitString + valueString : valueString + suitString;
      var x = j % 2 ? 32 : 20;
      text(context, x, 2 + 3 * j, [style], message);
    }
  }
}

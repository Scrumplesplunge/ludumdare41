// Create a canvas for each of the suits.
async function loadSuitBlockTextures() {
  var images = await loadImages(
      ["clubs", "diamonds", "hearts", "spades",
       "white_wall_left", "white_wall_middle"]);
  var suits = ["diamonds", "clubs", "hearts", "spades"];  // Wall order.
  for (var i = 0; i < 4; i++) {
    var icon = images.get(suits[i]);
    var background =
        images.get(i == 0 ? "white_wall_left" : "white_wall_middle");
    var canvas = document.createElement("canvas");
    canvas.width = background.width;
    canvas.height = background.height;
    var context = canvas.getContext("2d");
    suitBlockTextures.set(suits[i], {canvas, context, background, icon});
  }
  return suitBlockTextures;
}

function updateSuitSprites() {
  for (var suit of ["clubs", "diamonds", "hearts", "spades"]) {
    var {canvas, context, background, icon} = suitBlockTextures.get(suit);
    context.drawImage(background, 0, 0);
    context.drawImage(icon, 7, 7);
    var stackValue = solitaire[suit];
    if (stackValue == 0) continue;
    if (stackValue == 10) {
      // 10 is the only card with a two-digit value. This doesn't quite fit in
      // the available space without squashing the letters up.
      text(context, 5, 1, ["#888888"], "1");
      text(context, 10, 1, ["#888888"], "0");
    } else if (stackValue < 10) {
      text(context, 8, 1, ["#888888"], "A23456789"[stackValue]);
    } else {
      text(context, 8, 1, ["#888888"], "JQK"[stackValue - 11]);
    }
  }
}

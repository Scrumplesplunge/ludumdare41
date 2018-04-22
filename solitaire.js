// Create a canvas for each of the suits.
async function loadSuitSprites() {
  var suits = ["clubs", "diamonds", "hearts", "spades"];
  var suitImages = new Map(await Promise.all(
      suits.map(async name => [name, await loadImage(name + ".png")])));
  for (var [suit, image] of suitImages) {
    var canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    var context = canvas.getContext("2d");
    suitSprites.set(suit, {canvas, context, image});
  }
  return suitSprites;
}

function updateSuitSprites() {
  for (var suit of ["clubs", "diamonds", "hearts", "spades"]) {
    var {canvas, context, image} = suitSprites.get(suit);
    context.drawImage(image, 0, 0);
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

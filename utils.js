// Asynchronously load an image file.
function loadImage(name) {
  return new Promise((resolve, reject) => {
    var image = new Image;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = name;
  });
}

// Asynchronously load a sound file.
function loadSound(name) {
  return new Promise((resolve, reject) => {
    var sound = new Audio;
    sound.addEventListener("canplaythrough", () => resolve(sound));
    sound.onerror = reject;
    sound.src = name;
  });
}

// Extract image data from an image.
function getImageData(image) {
  // We need the image to be on a canvas to extract the image data.
  var canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  var context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

function delay(seconds) {
  return new Promise((resolve, reject) => setTimeout(resolve, 1000 * seconds));
}

function cardColor(card) {
  switch (card.slice(-1)) {
    case HEARTS:
    case DIAMONDS:
      return "#ff0000";
    case CLUBS:
    case SPADES:
      return "#000000";
  }
}

function cardValue(card) {
  var valueString = card.slice(0, -1);
  switch (valueString) {
    case "A": return 1;
    case "J": return 11;
    case "Q": return 12;
    case "K": return 13;
    default: return parseInt(valueString, 10);
  }
}

function hexByte(x) { return x.toString(16).padStart(2, "0"); }

function colorAt(array, index) {
  var r = array[index], g = array[index + 1], b = array[index + 2];
  return "#" + [r, g, b].map(hexByte).join("");
}

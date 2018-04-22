// Asynchronously load an image file.
function loadImage(name) {
  return new Promise((resolve, reject) => {
    var image = new Image;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = name;
  });
}

async function loadImages(images) {
  async function loadSingleImage(name) {
    return [name, await loadImage(name + ".png")];
  }
  return new Map(await Promise.all(images.map(loadSingleImage)));
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

// Play a sound.
function playSound(name) { return (new Audio(name + ".ogg")).play(); }

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

function hexByte(x) { return x.toString(16).padStart(2, "0"); }

function colorAt(array, index) {
  var r = array[index], g = array[index + 1], b = array[index + 2];
  return "#" + [r, g, b].map(hexByte).join("");
}

// Automatically resize and position the canvas in the centre of the window.
function resize() {
  var aspect = WIDTH / HEIGHT;
  var heightIfFullWidth = window.innerWidth / aspect;
  var widthIfFullHeight = window.innerHeight * aspect;
  if (heightIfFullWidth <= window.innerHeight) {
    // Canvas is full-width, possibly with unused space above and below.
    var unusedRows = window.innerHeight - heightIfFullWidth;
    canvas.style.top = 0.5 * unusedRows + "px";
    canvas.style.left = "0px";
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = heightIfFullWidth + "px";
  } else {
    // Canvas is full-height, possibly with unused space to the left and right.
    var unusedColumns = window.innerWidth - widthIfFullHeight;
    canvas.style.top = "0px";
    canvas.style.left = 0.5 * unusedColumns + "px";
    canvas.style.width = widthIfFullHeight + "px";
    canvas.style.height = window.innerHeight + "px";
  }
}
window.addEventListener("load", resize);
window.addEventListener("resize", resize);

var edgeHandlers = new Map;
function onInput(input, state, handler) {
  if (!edgeHandlers.has(input)) edgeHandlers.set(input, [[], []]);
  var handlers = edgeHandlers.get(input);
  handlers[state].push(handler);
}

function handleInput(input, state) {
  if (edgeHandlers.has(input) && inputs.get(input) != state) {
    for (var handler of edgeHandlers.get(input)[state]) handler();
  }
  if (input.substr(0, 7) == "TOGGLE:") {
    // Toggle the value on keydown.
    if (state == 1) inputs.set(input, 1 - inputs.get(input));
  } else {
    inputs.set(input, state);
  }
}

// Set or unset inputs when keys are pressed.
function handleKeyCode(event, state) {
  if (!keyMap.has(event.code)) return;
  handleInput(keyMap.get(event.code), state);
}

window.addEventListener("keydown", event => handleKeyCode(event, 1));
window.addEventListener("keyup", event => handleKeyCode(event, 0));
window.addEventListener("mousedown", event => {
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  } else {
    handleInput("ATTACK", 1);
  }
});
window.addEventListener("mouseup", event => {
  if (!document.pointerLockElement) return;
  handleInput("ATTACK", 0);
});
window.addEventListener("mousemove", event => {
  if (!document.pointerLockElement) return;
  player.angle = angNorm(player.angle + event.movementX * MOUSE_SENSITIVITY);
})

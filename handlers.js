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
resize();
window.addEventListener("resize", resize);

var edgeHandlers = new Map;
function onInput(input, state, handler) {
  if (!edgeHandlers.has(input)) edgeHandlers.set(input, [[], []]);
  var handlers = edgeHandlers.get(input);
  handlers[state].push(handler);
}

// Set or unset inputs when keys are pressed.
function handleKeyCode(code, state) {
  if (!keyMap.has(event.code)) return;
  var input = keyMap.get(event.code);
  if (edgeHandlers.has(input)) {
    for (var handler of edgeHandlers.get(input)[state]) handler();
  }
  if (input.substr(0, 7) == "TOGGLE:") {
    // Toggle the value on keydown.
    if (state == 1) inputs.set(input, 1 - inputs.get(input));
  } else {
    inputs.set(input, state);
  }
}
window.addEventListener("keydown", event => handleKeyCode(event.code, 1));
window.addEventListener("keyup", event => handleKeyCode(event.code, 0));

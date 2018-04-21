const WIDTH = 80;
const HEIGHT = 60;
const SCALE = 10;

const canvas = document.getElementById("display");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = SCALE * WIDTH + "px";
canvas.style.height = SCALE * HEIGHT + "px";
const context = canvas.getContext("2d");

import { Level, PALETTE, initializeDrawer, drawLevel, setCellSize, drawUi, inputHandler, mainLevels, metaLevel, drawBannerMessage } from "./internal";
import recursoUrl from "./fonts/recurso-sans/RecursoSans-SemiBold.ttf";
import ubuntuUrl from "./fonts/ubuntu-font-family-0.83/Ubuntu-M.ttf";

const canvas = document.querySelector<HTMLCanvasElement>("#game_canvas")!;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

let fontRecurso = new FontFace("Recurso", `url(${recursoUrl})`);
let fontUbuntu = new FontFace("Ubuntu-M", `url(${ubuntuUrl})`);
fontRecurso.load().then((font) => {
  document.fonts.add(font);
  console.log(`font ready: ${font.family}`);
}, (result) => {
  console.log(`failed loading font Recurso Sans: ${result}`);
});
fontUbuntu.load().then((font) => {
  document.fonts.add(font);
  console.log(`font ready: ${font.family}`);
}, (result) => {
  console.log(`failed loading font Ubuntu: ${result}`);
});

export const uiRatio = .16;
function getLevelCenter() {
  return [canvas.width * (.5 + uiRatio / 2), canvas.height / 2];
}
function getUiCenter() {
  return [canvas.width * uiRatio / 2, canvas.height / 2];
}


export let timestepStart: number = 0;
export const MILLISECOND_PER_TILE: number = 600;

export let editorMode = false;


// initialize the level
export let levelNumber = 0;
export let initialState = mainLevels[levelNumber];
export let mainLevel = new Level(initialState);
initializeDrawer(mainLevel);
export function setLevel(n: number) {
  if (n < 0 || n >= mainLevels.length) {
    console.warn(`level ${n} does not exist`);
    return;
  }
  levelNumber = n;
  initialState = mainLevels[levelNumber];
  mainLevel = new Level(initialState);
  initializeDrawer(mainLevel);
  setCellSize([canvas.width * (1 - uiRatio), canvas.height], levelCenter);
}


let levelCenter: number[];
let uiCenter: number[];
function updateCenter() {
  levelCenter = getLevelCenter();
  uiCenter = getUiCenter();
}
updateCenter();

export function setEditorMode(flag: boolean) {
  editorMode = flag;
}

let frameCount: number = 0;
let timeStepSaved: number = 0;
let frameRateText: string = "FPS:";
const FRAME_UPDATE_SPAN = 1000;
function updateFrameRate() {
  if (Math.floor(timestepGlobal / FRAME_UPDATE_SPAN) > Math.floor(timeStepSaved / FRAME_UPDATE_SPAN)) {
    frameRateText = `FPS: ${(1000 / (timestepGlobal - timeStepSaved) * frameCount).toFixed(2)}`;
    timeStepSaved = timestepGlobal;
    frameCount = 0;
  }
  else frameCount++;
}

export let timestepGlobal = 0;
// main loop; game logic lives here
function every_frame(cur_timestamp: number) {
  inputHandler.unblockInput();

  timestepGlobal = cur_timestamp;
  updateFrameRate();

  // handle resize
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    // .clientWidth is the element's real size, .width is a canvas-specific property: the rendering size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.imageSmoothingEnabled = false;
    updateCenter();
    setCellSize([canvas.width * (1 - uiRatio), canvas.height], levelCenter);
  }

  // update
  mainLevel.updateState();
  metaLevel.update();

  // draw
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE[8]; // background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawLevel(ctx);
  drawUi(ctx, uiCenter);
  drawBannerMessage(ctx, [canvas.width * (1 - uiRatio), canvas.height], levelCenter);

  if (editorMode) {
    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE[5];
    ctx.font = "12px Ubuntu-M";
    ctx.fillText(frameRateText, 20, 20);
  }

  requestAnimationFrame(every_frame);
}

document.addEventListener("keydown", inputHandler.keyDownListener.bind(inputHandler));
document.addEventListener("keyup", inputHandler.keyUpListener.bind(inputHandler));

// The loading screen is done in HTML so it loads instantly
const loading_screen_element = document.querySelector<HTMLDivElement>("#loading_screen")!;
const clickMessageElement = document.querySelector<HTMLDivElement>("#click_message")!;

// By the time we run this code, everything's loaded and we're ready to start
clickMessageElement.innerText = "Click to start!";

// It's good practice to wait for user input, and also required if your game has sound
document.addEventListener("pointerdown", _event => {
  loading_screen_element.style.opacity = "0";
  clickMessageElement.remove();
  requestAnimationFrame(every_frame);
}, { once: true });

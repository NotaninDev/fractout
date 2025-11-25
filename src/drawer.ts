import { Level, add, scale, levelNumber, mainLevel, timestepGlobal, BRICK_MAX_DEPTH, Brick, Coordinates, inputHandler, registerZoomAnim, animationList, AnimationType, AnimationZoom, AnimationDepthWarning, closeDepthWarning, Heart, HeartState, editorMode, AnimationHeartbreak } from "./internal";

export function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}
export function lerpArray(a: number[], b: number[], t: number) {
    return add(scale(a, (1 - t)), scale(b, t));
}

export function clamp(a: number, b: number, t: number) {
    if (a > b) {
        console.error(`clamp boundaries (${a}, ${b}) are invalid`);
        return t;
    }
    return Math.min(b, Math.max(a, t));
}

function toRadian(x: number) { return x * Math.PI / 180; }

export function imageFromName(fileName: string, extension: string = "png"): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // to avoid CORS if used with Canvas
        img.src = new URL(`./images/${fileName}.${extension}`, import.meta.url).href
        img.onload = () => {
            resolve(img);
        }
        img.onerror = e => {
            reject(e);
        }
    })
}

export function imageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // to avoid CORS if used with Canvas
        img.src = url;
        img.onload = () => {
            resolve(img);
        }
        img.onerror = e => {
            reject(e);
        }
    })
}

export const PALETTE = ["#ffebd8", "#ff7f00", "#4f67ff", "#19011a"] as const;

const whiteLeavesTexture = await imageFromName("white leaves", "svg");
const blackLeavesTexture = await imageFromName("black leaves", "svg");
const selectorTexture = await imageFromName("leaf selector", "svg");
const zoomInTexture = await imageFromName("zoom in DR", "svg");
const zoomInSelectorTexture = await imageFromName("zoom in selector DR", "svg");
const zoomOutTexture = await imageFromName("zoom out U", "svg");
const zoomOutSelectorTexture = await imageFromName("zoom out selector U", "svg");
const heartTexture = await imageFromName("heart", "svg");
const brokenHeartLTexture = await imageFromName("broken heart L", "svg");
const brokenHeartRTexture = await imageFromName("broken heart R", "svg");
const notanTexture = await imageFromName('notan bird');
const playerTexture = await imageFromName('example');
/** smallest possible size of the smallest brick in pixel */
const MIN_BRICK_SIZE = 14;
/** smallest possible padding size of the brick view frame in pixel */
const MIN_BRICK_VIEW_PADDING_SIZE = 24;
/** smallest possible size of the zoom button area in pixel */
const MIN_ZOOM_BUTTON_AREA_SIZE = 60;
/** margin size of the play area in pixel */
const PLAY_AREA_MARGIN_SIZE = 15;


let levelDrawer: Level;
let rootBrickSize: number;
let brickViewSize: number;
let zoomButtonAreaSize: number;
let playAreaSize: number;
export let zoomCoords: Coordinates;
let textRatio: number;
/** the top left coordinates of the root brick in pixels; [x, y] */
let rootBrickTopLeft: Readonly<number[]>;
/** the top left coordinates of the brick view frame in pixels; [x, y] */
let brickViewTopLeft: Readonly<number[]>;
/** the top left coordinates of the play area in pixels; [x, y] */
let playAreaTopLeft: Readonly<number[]>;
let playAreaCenter: Readonly<number[]>;
export function initializeDrawer(levelAttr: Level) {
    levelDrawer = levelAttr;
    zoomCoords = new Coordinates([]);
}

/**
 * set brick size and its top-left coordinates
 * @param maxCanvasSize [width, height]
 * @param levelCenter [x, y]
 */
export function setBrickSize(maxCanvasSize: Readonly<number[]>, levelCenter: Readonly<number[]>) {
    playAreaCenter = levelCenter.map(Math.round);

    /** smallest possible size of the root brick in pixel */
    const minRootBrickSize = MIN_BRICK_SIZE * Math.pow(2, BRICK_MAX_DEPTH);
    const minPlayAreaSize = minRootBrickSize + MIN_BRICK_VIEW_PADDING_SIZE * 2 + MIN_ZOOM_BUTTON_AREA_SIZE * 2;
    /** ratio of the size of the drawn brick to its smallest possible size */
    let brickRatio = Math.max(1, (Math.min(maxCanvasSize[0], maxCanvasSize[1]) - PLAY_AREA_MARGIN_SIZE * 2) / minPlayAreaSize);
    rootBrickSize = Math.floor(minRootBrickSize * brickRatio / 2) * 2;
    brickRatio = rootBrickSize / minRootBrickSize;
    rootBrickTopLeft = add(playAreaCenter, scale([1, 1], -rootBrickSize / 2));
    brickViewTopLeft = add(rootBrickTopLeft, scale([1, 1], -MIN_BRICK_VIEW_PADDING_SIZE * brickRatio));
    brickViewSize = rootBrickSize + MIN_BRICK_VIEW_PADDING_SIZE * brickRatio * 2;

    zoomButtonAreaSize = MIN_ZOOM_BUTTON_AREA_SIZE * brickRatio;
    playAreaTopLeft = add(brickViewTopLeft, scale([1, 1], -zoomButtonAreaSize));
    playAreaSize = brickViewSize + zoomButtonAreaSize * 2;

    textRatio = brickRatio;
}

let uiTopLeft: Readonly<number[]>;
let uiAreaSize: Readonly<number[]>;
let uiButtonSize: number;
let uiButtonMarginSize: number;
let scoreHeartSize: number;
let scoreWidth: number;
let scoreTopLeft: Readonly<number[]>;
export function setUiSize(canvasSize: Readonly<number[]>, center: number[]) {
    // ui buttons
    uiTopLeft = add(center, [canvasSize[0] * (.5 - UI_BUTTON_AREA_WIDTH_RATIO), canvasSize[1] * -.5]).map(Math.round);
    uiAreaSize = canvasSize;
    const uiButtonWidthConstrained = canvasSize[0] * (UI_BUTTON_AREA_WIDTH_RATIO - UI_BUTTON_MARGIN_RATIO * 2) <= canvasSize[1] * ((UI_BUTTON_AREA_HEIGHT_RATIO - UI_BUTTON_MARGIN_RATIO * 4) / 3);
    uiButtonSize = uiButtonWidthConstrained ? (canvasSize[0] * (UI_BUTTON_AREA_WIDTH_RATIO - UI_BUTTON_MARGIN_RATIO * 2)) : (canvasSize[1] * ((UI_BUTTON_AREA_HEIGHT_RATIO - UI_BUTTON_MARGIN_RATIO * 4) / 3));
    uiButtonMarginSize = (uiButtonWidthConstrained ? canvasSize[0] : canvasSize[1]) * UI_BUTTON_MARGIN_RATIO;

    // score
    scoreHeartSize = Math.min((uiAreaSize[0] * (1 - UI_BUTTON_AREA_WIDTH_RATIO) * SCORE_HEART_WIDTH_RATIO), (uiAreaSize[1] * (1 - SCORE_VERTICAL_MARGIN_RATIO * 2) / (mainLevel.hearts.length - SCORE_VERTICAL_STACK_RATIO * (mainLevel.hearts.length - 1))));
    scoreWidth = scoreHeartSize / SCORE_HEART_WIDTH_RATIO;
    const scoreHeight = scoreHeartSize * (mainLevel.hearts.length - SCORE_VERTICAL_STACK_RATIO * (mainLevel.hearts.length - 1));
    scoreTopLeft = add(center, scale(canvasSize, -.5), [(uiAreaSize[0] * (1 - UI_BUTTON_AREA_WIDTH_RATIO) - scoreWidth) / 2, (uiAreaSize[1] - scoreHeight) / 2]).map(Math.round);
}

export function setZoomCoords(coords: Coordinates) {
    zoomCoords = coords;
}

/**
 * given coordinates in the window, return coordinates in the level
 * @param coordsWindow [x, y]; absolute coordinates in the window
 * @returns if the input is inside the root brick, coordinates in the root brick scaled to [0, 1] on both axes in the order [x, y]. `null` otherwise.
 */
export function coordsWindowToCoordsLevel(coordsWindow: Readonly<number[]>) {
    // can't get the window coordinates correctly on the first frame
    if (timestepGlobal === 0) {
        return null;
    }
    if (coordsWindow.length !== 2) {
        console.error(`input is size ${coordsWindow.length}; should be 2 instead`);
        return null;
    }

    return scale(add(coordsWindow, scale(rootBrickTopLeft, -1)), 1 / rootBrickSize);
}

/**
 * given coordinates in the window, return if it's within the play area
 * @param coordsWindow [x, y]; absolute coordinates in the window
 * @returns if the input is inside the play area
 */
export function coordsInPlayArea(coordsWindow: Readonly<number[]>) {
    // can't get the window coordinates correctly on the first frame
    if (timestepGlobal === 0 || coordsWindow.length !== 2) {
        return false;
    }
    return coordsWindow[0] >= playAreaTopLeft[0] &&
        coordsWindow[0] <= playAreaTopLeft[0] + playAreaSize &&
        coordsWindow[1] >= playAreaTopLeft[1] &&
        coordsWindow[1] <= playAreaTopLeft[1] + playAreaSize;
}



export enum UiButtonType {
    None = 200,
    Undo,
    Redo,
    Reset
}
export function getUiButtonClick() {
    if (inputHandler.mouseDownEventUnused && inputHandler.mouseButton === 0 && inputHandler.windowCoords !== null) {
        if (mainLevel.canUndo() &&
            inButtonRect(inputHandler.windowCoords, [uiTopLeft[0] + uiButtonMarginSize, uiTopLeft[1] + uiAreaSize[1] - (uiButtonMarginSize + uiButtonSize) * 3], uiButtonSize)) {
            inputHandler.mouseDownEventUnused = false;
            return UiButtonType.Undo;
        }
        if (mainLevel.canRedo() &&
            inButtonRect(inputHandler.windowCoords, [uiTopLeft[0] + uiButtonMarginSize, uiTopLeft[1] + uiAreaSize[1] - (uiButtonMarginSize + uiButtonSize) * 2], uiButtonSize)) {
            inputHandler.mouseDownEventUnused = false;
            return UiButtonType.Redo;
        }
        if (mainLevel.canRestart() &&
            inButtonRect(inputHandler.windowCoords, [uiTopLeft[0] + uiButtonMarginSize, uiTopLeft[1] + uiAreaSize[1] - (uiButtonMarginSize + uiButtonSize) * 1], uiButtonSize)) {
            inputHandler.mouseDownEventUnused = false;
            return UiButtonType.Reset;
        }
    }
    return UiButtonType.None;
}


const zoomButtonClickable = [false, false, false, false];
export let usedZoom = false;

export function evaluateZoomButtonClick() {
    if (inputHandler.mouseDownEventUnused && inputHandler.mouseButton === 0) {
        if (inputHandler.windowCoords !== null) {
            const activeZoomButton = getActiveZoomButton(inputHandler.windowCoords);
            if (activeZoomButton !== null) {
                const zoomType = activeZoomButton["type"];
                let childIndex: number | null;
                if (zoomType === ZoomType.In) {
                    switch (activeZoomButton["rotation"]) {
                        case 0:
                            childIndex = 0;
                            break;
                        case 1:
                            childIndex = 1;
                            break;
                        case 2:
                            childIndex = 3;
                            break;
                        case 3:
                            childIndex = 2;
                            break;

                        default:
                            console.warn(`invalid index:`, activeZoomButton["rotation"]);
                            childIndex = -1;
                            break;
                    }
                }
                else childIndex = null;

                if (zoomType === ZoomType.Out && zoomCoords.path.length == 0) return;
                if (zoomType === ZoomType.In && !zoomButtonClickable[childIndex!]) return;
                inputHandler.mouseDownEventUnused = false;
                registerZoomAnim(zoomType, childIndex);
                closeDepthWarning();
                usedZoom = true;
            }
        }
    }
}

export enum ZoomType {
    In = 300,
    Out,
}

/**
 * get the zoom button the given coordinates is on
 * @param coordsWindow [x, y]; absolute coordinates in the window
 * @returns object representing the button the given coordinates is on, or `null` if no such button exists
 */
function getActiveZoomButton(coordsWindow: Readonly<number[]>) {
    // can't get the window coordinates correctly on the first frame
    if (timestepGlobal === 0 || coordsWindow.length !== 2) {
        return null;
    }
    if (inButtonRect(coordsWindow, playAreaTopLeft, zoomButtonAreaSize)) return { "type": ZoomType.In, "rotation": 0 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, 0]), zoomButtonAreaSize)) return { "type": ZoomType.In, "rotation": 1 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, playAreaSize - zoomButtonAreaSize]), zoomButtonAreaSize)) return { "type": ZoomType.In, "rotation": 2 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [0, playAreaSize - zoomButtonAreaSize]), zoomButtonAreaSize)) return { "type": ZoomType.In, "rotation": 3 };

    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [(playAreaSize - zoomButtonAreaSize) / 2, 0]), zoomButtonAreaSize)) return { "type": ZoomType.Out, "rotation": 0 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, (playAreaSize - zoomButtonAreaSize) / 2]), zoomButtonAreaSize)) return { "type": ZoomType.Out, "rotation": 1 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [(playAreaSize - zoomButtonAreaSize) / 2, playAreaSize - zoomButtonAreaSize]), zoomButtonAreaSize)) return { "type": ZoomType.Out, "rotation": 2 };
    if (inButtonRect(coordsWindow, add(playAreaTopLeft, [0, (playAreaSize - zoomButtonAreaSize) / 2]), zoomButtonAreaSize)) return { "type": ZoomType.Out, "rotation": 3 };
    return null;
}

/**
 * private helper function; check if the given coordinates is on the button given by top-left coordinates
 * @param coordsWindow [x, y]; absolute coordinates in the window
 * @param topLeft [x, y]; top-left coordinates of the zoom button
 * @param buttonSize size of the button in pixels
 * @returns if the given coordinates is in the button area
 */
function inButtonRect(coordsWindow: Readonly<number[]>, topLeft: Readonly<number[]>, buttonSize: number) {
    return coordsWindow[0] >= topLeft[0] && coordsWindow[0] <= topLeft[0] + buttonSize && coordsWindow[1] >= topLeft[1] && coordsWindow[1] <= topLeft[1] + buttonSize;
}

/**
 * this function mainly updates zoom button clickability
 */
export function updateZoomState() {
    const zoomedBrick = mainLevel.getBrickByCoords(zoomCoords);
    for (let i = 0; i < zoomButtonClickable.length; i++) {
        zoomButtonClickable[i] = zoomedBrick?.children[i] !== null;
    }
}

export function getMessageCoordinates() {
    if (inputHandler.levelCoords === null || !mainLevel.inMap(inputHandler.levelCoords)) {
        return add(rootBrickTopLeft, [rootBrickSize * .27, rootBrickSize * .46]);
    }
    return add(rootBrickTopLeft, [rootBrickSize * (inputHandler.levelCoords[0] <= .19 ? .06 : (inputHandler.levelCoords[0] >= .68 ? .55 : (inputHandler.levelCoords[0] - .13))),
    rootBrickSize * (inputHandler.levelCoords[1] + (inputHandler.levelCoords[1] <= .75 ? .14 : -.21))]);
}



function drawTutorialText(context: CanvasRenderingContext2D) {
    switch (levelNumber) {
        default:
            break;
    }
}

const BRICK_VIEW_LINE_WIDTH = 4;

export function drawLevel(context: CanvasRenderingContext2D) {
    context.save();
    context.beginPath();
    context.rect(brickViewTopLeft[0], brickViewTopLeft[1], brickViewSize, brickViewSize);
    context.clip();

    let x0 = rootBrickTopLeft[0];
    let x1 = rootBrickTopLeft[0] + rootBrickSize;
    let y0 = rootBrickTopLeft[1];
    let y1 = rootBrickTopLeft[1] + rootBrickSize;
    let x0Parent = rootBrickTopLeft[0];
    let x1Parent = rootBrickTopLeft[0] + rootBrickSize;
    let y0Parent = rootBrickTopLeft[1];
    let y1Parent = rootBrickTopLeft[1] + rootBrickSize;
    for (let i = zoomCoords.path.length - 1; i >= 0; i--) {
        const brickIndex = zoomCoords.path[i];
        if (brickIndex % 2 === 0) {
            x1 = lerp(x0, x1, 2);
            if (i < zoomCoords.path.length - 1) {
                x1Parent = lerp(x0Parent, x1Parent, 2);
            }
        }
        else {
            x0 = lerp(x0, x1, -1);
            if (i < zoomCoords.path.length - 1) {
                x0Parent = lerp(x0Parent, x1Parent, -1);
            }
        }
        if (Math.floor(brickIndex / 2) === 0) {
            y1 = lerp(y0, y1, 2);
            if (i < zoomCoords.path.length - 1) {
                y1Parent = lerp(y0Parent, y1Parent, 2);
            }
        }
        else {
            y0 = lerp(y0, y1, -1);
            if (i < zoomCoords.path.length - 1) {
                y0Parent = lerp(y0Parent, y1Parent, -1);
            }
        }
    }

    if (animationList[AnimationType.Zoom].length == 1) {
        const zoomAnim = animationList[AnimationType.Zoom][0] as AnimationZoom;
        x0 = lerp(x0Parent, x0, zoomAnim.getZoomRatio());
        x1 = lerp(x1Parent, x1, zoomAnim.getZoomRatio());
        y0 = lerp(y0Parent, y0, zoomAnim.getZoomRatio());
        y1 = lerp(y1Parent, y1, zoomAnim.getZoomRatio());
    }

    let bricksCurrent: Brick[];
    let bricksNext: Brick[] = [mainLevel.rootBrick];
    for (let depth = 0; bricksNext.length > 0 && depth < zoomCoords.path.length + BRICK_MAX_DEPTH + 4; depth++) {
        bricksCurrent = bricksNext;
        bricksNext = [];
        for (let i = 0; i < bricksCurrent.length; i++) {
            const brick = bricksCurrent[i];
            if (brick.isIntact()) {
                drawBrick(context, x0, y0, x1, y1, brick);
            }
            else {
                if (mainLevel.heartParents.has(brick)) {
                    drawBrokenHearts(context, x0, y0, x1, y1, brick);
                }
                for (let i = 0; i < brick.children.length; i++) {
                    const child = brick.children[i];
                    if (child !== null) {
                        bricksNext.push(child);
                    }
                }
            }
        }
    }

    context.restore();

    if (animationList[AnimationType.DepthWarning].length > 0) {
        const warningAnim = animationList[AnimationType.DepthWarning][0] as AnimationDepthWarning;
        context.textAlign = "left";
        context.textBaseline = "top";
        context.font = `${18 * textRatio}px Recurso`;
        context.fillStyle = PALETTE[3];
        context.fillRect(warningAnim.coords[0] - 5 * textRatio, warningAnim.coords[1] - 4 * textRatio, 187 * textRatio, 24 * textRatio);
        context.fillRect(warningAnim.coords[0] + 10 * textRatio, warningAnim.coords[1] + 19 * textRatio, 201 * textRatio, 24 * textRatio);
        context.fillStyle = PALETTE[0];
        context.fillText("Too small to select!", warningAnim.coords[0], warningAnim.coords[1]);
        context.fillText("Zoom in to go further", warningAnim.coords[0] + 15 * textRatio, warningAnim.coords[1] + 22 * textRatio);
    }

    context.save();
    context.beginPath();
    context.rect(playAreaTopLeft[0] - PLAY_AREA_MARGIN_SIZE, playAreaTopLeft[1] - PLAY_AREA_MARGIN_SIZE, playAreaSize + PLAY_AREA_MARGIN_SIZE * 2, playAreaSize + PLAY_AREA_MARGIN_SIZE * 2);
    context.rect(brickViewTopLeft[0], brickViewTopLeft[1], brickViewSize, brickViewSize);
    context.clip("evenodd");

    context.beginPath();
    context.strokeStyle = PALETTE[3];
    context.lineWidth = BRICK_VIEW_LINE_WIDTH * 2;
    context.rect(brickViewTopLeft[0], brickViewTopLeft[1], brickViewSize, brickViewSize);
    context.stroke();

    const drawZoomSelector = animationList[AnimationType.Zoom].length === 0;
    for (let i = 0; i < 4; i++) {
        const childIndex = i >= 2 ? (5 - i) : i;
        context.save();
        context.translate(playAreaCenter[0], playAreaCenter[1]);
        context.rotate(Math.PI * i / 2);
        context.translate(-playAreaCenter[0], -playAreaCenter[1]);

        context.drawImage(zoomInTexture, playAreaTopLeft[0], playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        if (drawZoomSelector && zoomButtonClickable[childIndex]) {
            context.drawImage(zoomInSelectorTexture, playAreaTopLeft[0], playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        }

        context.drawImage(zoomOutTexture, playAreaCenter[0] - zoomButtonAreaSize / 2, playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        if (drawZoomSelector && zoomCoords.path.length > 0) {
            context.drawImage(zoomOutSelectorTexture, playAreaCenter[0] - zoomButtonAreaSize / 2, playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        }

        context.restore();
    }

    context.restore();

    // draw tutorial text
    drawTutorialText(context);
}

const BANNER_HEIGHT_RATIO = 1;
const BANNER_WIDTH_RATIO = 25;
const BANNER_GRADIENT_STEP_RATIO = .025;
const BANNER_DISTANCE_RATIO = 7.2;
const BANNER_FONT_SIZE_RATIO = .6;

// canvasSize is width, height
export function drawWinMessage(context: CanvasRenderingContext2D, canvasSize: Readonly<number[]>, levelCenter: number[]) {
    if (!levelDrawer.win) return;

    // todo: implement this
}

const UI_BUTTON_MARGIN_RATIO = .04;
const UI_BUTTON_AREA_WIDTH_RATIO = .4;
const UI_BUTTON_AREA_HEIGHT_RATIO = .8;
const UI_BUTTON_SELECTOR_OFFSET_RATIO = .1;
const SCORE_HEART_WIDTH_RATIO = .6;
const SCORE_VERTICAL_MARGIN_RATIO = .02;
const SCORE_VERTICAL_STACK_RATIO = .08;

/**
 * draw level number etc.
 * @param context context
 * @param canvasSize canvas size; [width, height]
 * @param center center of the ui panel
 */
export function drawUi(context: CanvasRenderingContext2D) {
    // draw buttons
    const buttonActive = [mainLevel.canUndo(), mainLevel.canRedo(), mainLevel.canRestart()];
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${uiButtonSize * .22}px Recurso`;
    context.fillStyle = PALETTE[3];
    context.strokeStyle = PALETTE[0];
    context.lineWidth = uiButtonSize * .05;
    for (let i = 0; i < 3; i++) {
        context.beginPath();
        context.roundRect(uiTopLeft[0] + uiButtonMarginSize, uiTopLeft[1] + uiAreaSize[1] - (uiButtonMarginSize + uiButtonSize) * (3 - i), uiButtonSize, uiButtonSize, uiButtonMarginSize);
        context.fill();
        context.beginPath();
        if (buttonActive[i]) {
            context.roundRect(
                uiTopLeft[0] + uiButtonMarginSize + uiButtonSize * UI_BUTTON_SELECTOR_OFFSET_RATIO,
                uiTopLeft[1] + uiAreaSize[1] - uiButtonMarginSize * (3 - i) - uiButtonSize * (3 - i - UI_BUTTON_SELECTOR_OFFSET_RATIO),
                uiButtonSize * (1 - UI_BUTTON_SELECTOR_OFFSET_RATIO * 2),
                uiButtonSize * (1 - UI_BUTTON_SELECTOR_OFFSET_RATIO * 2),
                uiButtonSize * .05);
            context.stroke();
        }
    }
    context.fillStyle = PALETTE[0];
    context.fillText("UNDO", uiTopLeft[0] + uiButtonMarginSize + uiButtonSize / 2, uiTopLeft[1] + uiAreaSize[1] - uiButtonMarginSize * 3 - uiButtonSize * 2.5);
    context.fillText("REDO", uiTopLeft[0] + uiButtonMarginSize + uiButtonSize / 2, uiTopLeft[1] + uiAreaSize[1] - uiButtonMarginSize * 2 - uiButtonSize * 1.5);
    context.fillText("RESET", uiTopLeft[0] + uiButtonMarginSize + uiButtonSize / 2, uiTopLeft[1] + uiAreaSize[1] - uiButtonMarginSize * 1 - uiButtonSize * .5);

    // draw scores
    context.fillStyle = PALETTE[3];
    for (let i = 0; i < mainLevel.hearts.length; i++) {
        const heart = mainLevel.hearts[i];
        const heartTopLeft = add(scoreTopLeft, [i % 2 === 0 ? 0 : (scoreWidth * (1 - SCORE_HEART_WIDTH_RATIO)), scoreHeartSize * (1 - SCORE_VERTICAL_STACK_RATIO) * i]);
        switch (heart.state) {
            case HeartState.Hidden:
                context.beginPath();
                context.arc(heartTopLeft[0] + scoreHeartSize / 2, heartTopLeft[1] + scoreHeartSize / 2, scoreHeartSize * .12, 0, Math.PI * 2);
                context.fill();
                break;

            case HeartState.Found:
                context.drawImage(heartTexture, heartTopLeft[0], heartTopLeft[1], scoreHeartSize, scoreHeartSize);
                break;

            case HeartState.Broken:
                context.drawImage(brokenHeartLTexture, heartTopLeft[0] - scoreHeartSize * BROKEN_HEART_OFFSET_RATIO, heartTopLeft[1], scoreHeartSize, scoreHeartSize);
                context.drawImage(brokenHeartRTexture, heartTopLeft[0] + scoreHeartSize * BROKEN_HEART_OFFSET_RATIO, heartTopLeft[1], scoreHeartSize, scoreHeartSize);
                break;
        }
    }
}

function drawBrick(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, brick: Brick) {
    // set outline
    for (let i = 0; i < brick.coords.path.length; i++) {
        switch (brick.coords.path[i]) {
            case 0:
                x1 = (x0 + x1) / 2;
                y1 = (y0 + y1) / 2;
                break;
            case 1:
                x0 = (x0 + x1) / 2;
                y1 = (y0 + y1) / 2;
                break;
            case 2:
                x1 = (x0 + x1) / 2;
                y0 = (y0 + y1) / 2;
                break;
            case 3:
                x0 = (x0 + x1) / 2;
                y0 = (y0 + y1) / 2;
                break;
        }
    }
    const xCenter = (x0 + x1) / 2;
    const yCenter = (y0 + y1) / 2;

    // list hearts to draw
    const hiddenHearts: Map<number, Heart[]> = new Map();
    const foundHearts: Heart[] = [];
    for (let i = 0; i < 4; i++) {
        hiddenHearts.set(i, []);
    }
    mainLevel.heartParents.get(brick)?.forEach(heart => {
        switch (heart.state) {
            case HeartState.Hidden:
                hiddenHearts.get(heart.coords.path[brick.coords.path.length])!.push(heart);
                break;
            case HeartState.Found:
                foundHearts.push(heart);
                break;
            case HeartState.Broken:
                // broken hearts shouldn't be here
                break;
        }
    });

    // draw brick
    context.drawImage(foundHearts.length > 0 ? blackLeavesTexture : whiteLeavesTexture, x0, y0, x1 - x0, y1 - y0)

    // draw hearts
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${(y1 - y0) * .27}px Recurso`;
    context.fillStyle = PALETTE[3];
    for (const [childIndex, hiddenHeartsSingleLeaf] of hiddenHearts) {
        if (hiddenHeartsSingleLeaf.length === 0) continue;
        const rotation = (childIndex < 2 ? childIndex : (5 - childIndex)) - .5;
        context.save();
        context.translate(xCenter, yCenter);
        context.rotate(Math.PI * rotation / 2);
        context.translate(-xCenter, -yCenter);
        if (hiddenHeartsSingleLeaf.length <= 9) {
            for (let i = 0; i < hiddenHeartsSingleLeaf.length; i++) {
                const scalingFactor = getHeartCenter(i);
                context.beginPath();
                context.arc(lerp(x0, x1, scalingFactor[0]), lerp(y0, y1, scalingFactor[1]), (x1 - x0) * .04, 0, Math.PI * 2);
                context.fill();
            }
        }
        else {
            context.fillText(hiddenHeartsSingleLeaf.length.toString(), xCenter, lerp(y0, y1, .13));
        }
        context.restore();
    }
    if (foundHearts.length > 0) {
        const heartSize = (x1 - x0) * .42;
        context.drawImage(heartTexture, xCenter - heartSize / 2, yCenter - heartSize / 2, heartSize, heartSize);
    }

    // draw clickable sign
    if (!mainLevel.win) {
        let clickableIndices = mainLevel.getClickableIndicesByCoords(brick.coords);
        if (clickableIndices !== null && foundHearts.length === 0) {
            for (const i of clickableIndices) {
                context.save();
                context.translate(xCenter, yCenter);
                switch (i) {
                    case 1:
                        context.rotate(Math.PI / 2);
                        break;
                    case 2:
                        context.rotate(-Math.PI / 2);
                        break;
                    case 3:
                        context.rotate(Math.PI);
                        break;

                    default:
                        break;
                }
                context.translate(-xCenter, -yCenter);
                context.drawImage(selectorTexture, x0, y0, x1 - x0, y1 - y0)
                context.restore();
            }
        }
    }
}

const BROKEN_HEART_OFFSET_RATIO = .07;

function drawBrokenHearts(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, brick: Brick) {
    if (brick.holeIndex === null) {
        console.warn(`brick ${brick.coords} has no hole`);
        return;
    }

    // set outline
    for (let i = 0; i < brick.coords.path.length; i++) {
        switch (brick.coords.path[i]) {
            case 0:
                x1 = (x0 + x1) / 2;
                y1 = (y0 + y1) / 2;
                break;
            case 1:
                x0 = (x0 + x1) / 2;
                y1 = (y0 + y1) / 2;
                break;
            case 2:
                x1 = (x0 + x1) / 2;
                y0 = (y0 + y1) / 2;
                break;
            case 3:
                x0 = (x0 + x1) / 2;
                y0 = (y0 + y1) / 2;
                break;
        }
    }
    const xCenter = (x0 + x1) / 2;
    const yCenter = (y0 + y1) / 2;

    const hearts: Heart[] = [];
    mainLevel.heartParents.get(brick)?.forEach(heart => {
        switch (heart.state) {
            case HeartState.Hidden:
            case HeartState.Found:
                // these hearts shouldn't be here
                break;
            case HeartState.Broken:
                hearts.push(heart);
                break;
        }
    });

    if (hearts.length === 0) {
        console.warn("no broken hearts on brick", brick.coords.path);
        return;
    }

    context.save();
    const rotation = (brick.holeIndex < 2 ? brick.holeIndex : (5 - brick.holeIndex)) - .5;
    context.translate(xCenter, yCenter);
    context.rotate(Math.PI * rotation / 2);
    context.translate(-xCenter, -yCenter);

    const heartSize = (x1 - x0) * .12;
    const heartOffset = heartSize * BROKEN_HEART_OFFSET_RATIO;
    for (let i = 0; i < Math.min(hearts.length, 9); i++) {
        const scalingFactor = getHeartCenter(i);
        const heartbreakAnim = AnimationHeartbreak.heartToAnim.get(hearts[i]);
        const time = heartbreakAnim === undefined ? 1 : heartbreakAnim.getTimeRatio();
        const heartCenterX = lerp(x0, x1, scalingFactor[0]);
        const heartCenterY = lerp(y0, y1, scalingFactor[1]);
        context.save();
        context.translate(heartCenterX, heartCenterY);
        context.rotate(Math.PI * .06);
        context.drawImage(brokenHeartLTexture, -heartSize / 2 - heartOffset * time, -heartSize / 2, heartSize, heartSize);
        context.drawImage(brokenHeartRTexture, -heartSize / 2 + heartOffset * time, -heartSize / 2, heartSize, heartSize);
        context.restore();
    }

    context.restore();
}

/**
 * get the scaling factors to get the coordinates of a heart
 * @param i index of the heart within a leaf
 * @returns scaling factors, each element is used in a lerp function; [x, y]
 */
function getHeartCenter(i: number) {
    switch (i) {
        case 0:
        case 1:
        case 2:
            return [.5, .271 - i * .15];
        case 3:
        case 4:
        case 5:
        case 6:
            return [.56 - (i % 2) * .12, .196 - Math.floor((i - 3) / 2) * .15];
        case 7:
        case 8:
            return [.62 - (i - 7) * .24, .121];
        default:
            return [0, .1];
    }
}

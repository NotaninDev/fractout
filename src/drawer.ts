import { Level, add, scale, levelNumber, mainLevel, timestepGlobal, BRICK_MAX_DEPTH, Brick, Coordinates, inputHandler, registerZoomAnim, animationList, AnimationType, AnimationZoom } from "./internal";

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

const leavesTexture = await imageFromName("leaves", "svg");
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
 * @param canvasSize [width, height]
 * @param levelCenter [x, y]
 */
export function setBrickSize(canvasSize: Readonly<number[]>, levelCenter: Readonly<number[]>) {
    const maxWidth = (Math.min(levelCenter[0], canvasSize[0] - levelCenter[0]) - PLAY_AREA_MARGIN_SIZE) * 2;
    const maxHeight = (Math.min(levelCenter[1], canvasSize[1] - levelCenter[1]) - PLAY_AREA_MARGIN_SIZE) * 2;
    /** smallest possible size of the root brick in pixel */
    const minRootBrickSize = MIN_BRICK_SIZE * Math.pow(2, BRICK_MAX_DEPTH);
    const minPlayAreaSize = minRootBrickSize + MIN_BRICK_VIEW_PADDING_SIZE * 2 + MIN_ZOOM_BUTTON_AREA_SIZE * 2;
    /** ratio of the size of the drawn brick to its smallest possible size */
    let brickRatio = Math.max(1, Math.min(maxWidth, maxHeight) / minPlayAreaSize);
    rootBrickSize = Math.floor(minRootBrickSize * brickRatio / 2) * 2;
    brickRatio = rootBrickSize / minRootBrickSize;
    rootBrickTopLeft = add(levelCenter, scale([1, 1], -rootBrickSize / 2));
    brickViewTopLeft = add(rootBrickTopLeft, scale([1, 1], -MIN_BRICK_VIEW_PADDING_SIZE * brickRatio));
    brickViewSize = rootBrickSize + MIN_BRICK_VIEW_PADDING_SIZE * brickRatio * 2;

    zoomButtonAreaSize = MIN_ZOOM_BUTTON_AREA_SIZE * brickRatio;
    playAreaTopLeft = add(brickViewTopLeft, scale([1, 1], -zoomButtonAreaSize));
    playAreaCenter = levelCenter;
    playAreaSize = brickViewSize + zoomButtonAreaSize * 2;

    textRatio = brickRatio;
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


const zoomButtonClickable = [false, false, false, false];

export function evaluateUiClick() {
    if (inputHandler.mouseDownEventUnused) {
        if (inputHandler.windowCoords !== null) {
            inputHandler.mouseDownEventUnused = false;
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
                registerZoomAnim(zoomType, childIndex);
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
    if (inZoomButtonRect(coordsWindow, playAreaTopLeft)) return { "type": ZoomType.In, "rotation": 0 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, 0]))) return { "type": ZoomType.In, "rotation": 1 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, playAreaSize - zoomButtonAreaSize]))) return { "type": ZoomType.In, "rotation": 2 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [0, playAreaSize - zoomButtonAreaSize]))) return { "type": ZoomType.In, "rotation": 3 };

    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [(playAreaSize - zoomButtonAreaSize) / 2, 0]))) return { "type": ZoomType.Out, "rotation": 0 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [playAreaSize - zoomButtonAreaSize, (playAreaSize - zoomButtonAreaSize) / 2]))) return { "type": ZoomType.Out, "rotation": 1 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [(playAreaSize - zoomButtonAreaSize) / 2, playAreaSize - zoomButtonAreaSize]))) return { "type": ZoomType.Out, "rotation": 2 };
    if (inZoomButtonRect(coordsWindow, add(playAreaTopLeft, [0, (playAreaSize - zoomButtonAreaSize) / 2]))) return { "type": ZoomType.Out, "rotation": 3 };
    return null;
}

/**
 * private helper function; check if the given coordinates is on the zoom button given by top-left coordinates
 * @param coordsWindow [x, y]; absolute coordinates in the window
 * @param topLeft [x, y]; top-left coordinates of the zoom button
 * @returns if the given coordinates is in the button area
 */
function inZoomButtonRect(coordsWindow: Readonly<number[]>, topLeft: Readonly<number[]>) {
    return coordsWindow[0] >= topLeft[0] && coordsWindow[0] <= topLeft[0] + zoomButtonAreaSize && coordsWindow[1] >= topLeft[1] && coordsWindow[1] <= topLeft[1] + zoomButtonAreaSize;
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
    for (let depth = 0; bricksNext.length > 0 && depth < zoomCoords.path.length + BRICK_MAX_DEPTH + 2; depth++) {
        bricksCurrent = bricksNext;
        bricksNext = [];
        for (let i = 0; i < bricksCurrent.length; i++) {
            const brick = bricksCurrent[i];
            if (brick.isIntact()) {
                drawBrick(context, x0, y0, x1, y1, brick);
            }
            else {
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

/**
 * draw level number etc.
 * @param context context
 * @param center center of the ui panel
 */
export function drawUi(context: CanvasRenderingContext2D, center: number[]) {
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

    // draw brick
    context.drawImage(leavesTexture, x0, y0, x1 - x0, y1 - y0)

    // draw clickable sign
    if (mainLevel.clickables.has(brick)) {
        const xCenter = (x0 + x1) / 2;
        const yCenter = (y0 + y1) / 2;
        for (const i of mainLevel.clickables.get(brick) as number[]) {
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

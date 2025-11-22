import { Level, add, scale, levelNumber, mainLevel, timestepGlobal, BRICK_MAX_DEPTH, Brick, Coordinates } from "./internal";

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
const MIN_BRICK_SIZE = 7;
/** smallest possible padding size of the brick view frame in pixel */
const MIN_BRICK_VIEW_PADDING_SIZE = 12;
/** smallest possible size of the zoom button area in pixel */
const MIN_ZOOM_BUTTON_AREA_SIZE = 60;
/** margin size of the play area in pixel */
const PLAY_AREA_MARGIN_SIZE = 15;


let levelDrawer: Level;
let rootBrickSize: number;
let brickViewSize: number;
let zoomButtonAreaSize: number;
let playAreaSize: number;
let textRatio: number;
/** the top left coordinates of the root brick in pixels; [x, y] */
let brickTopLeft: Readonly<number[]>;
/** the top left coordinates of the brick view frame in pixels; [x, y] */
let brickViewTopLeft: Readonly<number[]>;
/** the top left coordinates of the play area in pixels; [x, y] */
let playAreaTopLeft: Readonly<number[]>;
let playAreaCenter: Readonly<number[]>;
export function initializeDrawer(levelAttr: Level) {
    levelDrawer = levelAttr;
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
    brickTopLeft = add(levelCenter, scale([1, 1], -rootBrickSize / 2));
    brickViewTopLeft = add(brickTopLeft, scale([1, 1], -MIN_BRICK_VIEW_PADDING_SIZE * brickRatio));
    brickViewSize = rootBrickSize + MIN_BRICK_VIEW_PADDING_SIZE * brickRatio * 2;

    zoomButtonAreaSize = MIN_ZOOM_BUTTON_AREA_SIZE * brickRatio;
    playAreaTopLeft = add(brickViewTopLeft, scale([1, 1], -zoomButtonAreaSize));
    playAreaCenter = levelCenter;
    playAreaSize = brickViewSize + zoomButtonAreaSize * 2;
    console.log(playAreaTopLeft, playAreaSize);

    textRatio = brickRatio;
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

    return scale(add(coordsWindow, scale(brickTopLeft, -1)), 1 / rootBrickSize);
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

function toRadian(x: number) { return x * Math.PI / 180; }



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

    let bricksCurrent: Brick[];
    let bricksNext: Brick[] = [mainLevel.rootBrick];
    for (let depth = 0; bricksNext.length > 0; depth++) {
        bricksCurrent = bricksNext;
        bricksNext = [];
        for (let i = 0; i < bricksCurrent.length; i++) {
            const brick = bricksCurrent[i];
            if (brick.isIntact()) {
                drawBrick(context, brick);
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

    for (let i = 0; i < 4; i++) {
        context.save();
        context.translate(playAreaCenter[0], playAreaCenter[1]);
        context.rotate(Math.PI * i / 2);
        context.translate(-playAreaCenter[0], -playAreaCenter[1]);

        context.drawImage(zoomInTexture, playAreaTopLeft[0], playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        context.drawImage(zoomInSelectorTexture, playAreaTopLeft[0], playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);

        context.drawImage(zoomOutTexture, playAreaCenter[0] - zoomButtonAreaSize / 2, playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);
        context.drawImage(zoomOutSelectorTexture, playAreaCenter[0] - zoomButtonAreaSize / 2, playAreaTopLeft[1], zoomButtonAreaSize, zoomButtonAreaSize);

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

function drawBrick(context: CanvasRenderingContext2D, brick: Brick) {
    // set outline
    let y0 = brickTopLeft[1];
    let x0 = brickTopLeft[0];
    let y1 = y0 + rootBrickSize;
    let x1 = x0 + rootBrickSize;
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

    context.restore();
}

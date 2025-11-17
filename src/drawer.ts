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
const selectorTexture = await imageFromName("selector", "svg");
const heartTexture = await imageFromName("heart", "svg");
const brokenHeartLTexture = await imageFromName("broken heart L", "svg");
const brokenHeartRTexture = await imageFromName("broken heart R", "svg");
const notanTexture = await imageFromName('notan bird');
const playerTexture = await imageFromName('example');
/** smallest possible size of the smallest brick */
const minBrickSize = 8;
/** smallest possible size of the root brick */
const minRootBrickSize = minBrickSize * Math.pow(2, BRICK_MAX_DEPTH);


let levelDrawer: Level;
/** ratio of the size of the drawn brick to its smallest possible size */
let brickRatio: number;
let textRatio: number;
/** the top left coordinates of the level in pixels; [x, y] */
let topLeft: number[];
export function initializeDrawer(levelAttr: Level) {
    levelDrawer = levelAttr;
}

/**
 * set brick size and its top-left coordinates
 * @param canvasSize [width, height]
 * @param levelCenter [x, y]
 */
export function setBrickSize(canvasSize: Readonly<number[]>, levelCenter: Readonly<number[]>) {
    const maxWidth = Math.min(levelCenter[0], canvasSize[0] - levelCenter[0]) * 2;
    const maxHeight = Math.min(levelCenter[1], canvasSize[1] - levelCenter[1]) * 2;
    brickRatio = Math.max(1, Math.floor(Math.min(maxWidth, maxHeight) / minRootBrickSize));
    topLeft = add(levelCenter, scale([1, 1], -minRootBrickSize * brickRatio / 2));

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

    return scale(add(coordsWindow, scale(topLeft, -1)), 1 / (minRootBrickSize * brickRatio));
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
    return coordsWindow[0] >= topLeft[0] &&
        coordsWindow[0] <= topLeft[0] + minRootBrickSize * brickRatio &&
        coordsWindow[1] >= topLeft[1] &&
        coordsWindow[1] <= topLeft[1] + minRootBrickSize * brickRatio;
}

function toRadian(x: number) { return x * Math.PI / 180; }



function drawTutorialText(context: CanvasRenderingContext2D) {
    switch (levelNumber) {
        default:
            break;
    }
}

export function drawLevel(context: CanvasRenderingContext2D) {
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

/** todo: implement this */
function drawBrick(context: CanvasRenderingContext2D, brick: Brick) {
    // set outline
    let y0 = topLeft[1];
    let x0 = topLeft[0];
    let y1 = y0 + minRootBrickSize * brickRatio;
    let x1 = x0 + minRootBrickSize * brickRatio;
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

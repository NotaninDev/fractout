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

export function imageFromName(fileName: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // to avoid CORS if used with Canvas
        img.src = new URL(`./images/${fileName}.png`, import.meta.url).href
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

export const PALETTE = ["#9ee7d7", "#6ac0bd", "#5889a2", "#462c4b", "#724254", "#c18c72", "#fcebb6", "#a9f05f", "#5fad67", "#4e5e5e"] as const;
export const DESERT_PALETTE = ["#151244", "#60117f", "#922a95", "#be7dbc", "#350828", "#7f6962", "#f9cb60", "#f9960f", "#bc2f01", "#680703"] as const;

const notanTexture = await imageFromName('notan bird');
const playerTexture = await imageFromName('example');
const tileTexture = await imageFromName('tile');
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

function toRadian(x: number) { return x * Math.PI / 180; }



function drawTutorialText(context: CanvasRenderingContext2D) {
    switch (levelNumber) {
        default:
            break;
    }
}

export function drawLevel(context: CanvasRenderingContext2D) {
    context.strokeStyle = PALETTE[3];
    context.lineWidth = minBrickSize * brickRatio * .06;

    let bricksCurrent: { brick: Brick, coords: Coordinates }[];
    let bricksNext: { brick: Brick, coords: Coordinates }[] = [{ brick: mainLevel.rootBrick, coords: new Coordinates([]) }];
    for (let depth = 0; bricksNext.length > 0; depth++) {
        bricksCurrent = bricksNext;
        bricksNext = [];
        for (let i = 0; i < bricksCurrent.length; i++) {
            const { brick: brick, coords: coords } = bricksCurrent[i];
            if (brick.isIntact()) {
                drawBrick(context, brick, coords);
            }
            else {
                for (let i = 0; i < brick.children.length; i++) {
                    const child = brick.children[i];
                    if (child !== null) {
                        bricksNext.push({ brick: child, coords: new Coordinates(coords.path.concat(i)) });
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
function drawBrick(context: CanvasRenderingContext2D, brick: Brick, coords: Coordinates) {
    // set outline
    let yRaw0 = topLeft[1];
    let xRaw0 = topLeft[0];
    let yRaw1 = yRaw0 + minRootBrickSize * brickRatio;
    let xRaw1 = xRaw0 + minRootBrickSize * brickRatio;
    for (let i = 0; i < coords.path.length; i++) {
        switch (coords.path[i]) {
            case 0:
                xRaw1 = (xRaw0 + xRaw1) / 2;
                yRaw1 = (yRaw0 + yRaw1) / 2;
                break;
            case 1:
                xRaw0 = (xRaw0 + xRaw1) / 2;
                yRaw1 = (yRaw0 + yRaw1) / 2;
                break;
            case 2:
                xRaw1 = (xRaw0 + xRaw1) / 2;
                yRaw0 = (yRaw0 + yRaw1) / 2;
                break;
            case 3:
                xRaw0 = (xRaw0 + xRaw1) / 2;
                yRaw0 = (yRaw0 + yRaw1) / 2;
                break;
        }
    }
    const y0 = Math.round(yRaw0);
    const x0 = Math.round(xRaw0);
    const x1 = Math.round(xRaw1);
    const y1 = Math.round(yRaw1);

    const brickSize = minRootBrickSize * brickRatio * Math.pow(2, -coords.path.length);

    // clip brick area
    context.save();
    context.beginPath();
    context.roundRect(x0, y0, x1 - x0, y1 - y0, Math.round(brickSize * 0.067));
    context.clip();

    // draw brick
    context.fillStyle = PALETTE[5];
    context.fillRect(x0, y0, x1 - x0, y1 - y0);

    context.strokeStyle = PALETTE[3];
    context.lineWidth = Math.round(brickSize * .135);
    context.beginPath();
    context.moveTo(x0, y1);
    context.lineTo(x1, y1);
    context.stroke();
    context.lineWidth = Math.round(brickSize * .09);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x1, y0);
    context.stroke();

    context.lineWidth = Math.round(brickSize * .033);
    context.beginPath();
    context.moveTo(lerp(x0, x1, .28), lerp(y0, y1, .5));
    context.lineTo(lerp(x0, x1, .5), lerp(y0, y1, .5));
    context.lineTo(lerp(x0, x1, .5), lerp(y0, y1, .42));
    context.stroke();

    // draw clickable sign
    context.strokeStyle = PALETTE[7];
    context.lineWidth = Math.round(brickSize * .035);
    const clickableOffset = .24;
    for (let i = 0; i < brick.clickable.length; i++) {
        if (brick.clickable[i]) {
            const x0 = Math.round((i % 2 === 0) ? xRaw0 : ((xRaw0 + xRaw1) / 2));
            const x1 = Math.round((i % 2 === 0) ? ((xRaw0 + xRaw1) / 2) : xRaw1);
            const y0 = Math.round((i < 2) ? yRaw0 : ((yRaw0 + yRaw1) / 2));
            const y1 = Math.round((i < 2) ? ((yRaw0 + yRaw1) / 2) : yRaw1);
            context.beginPath();
            context.moveTo(lerp(x0, x1, .5 - clickableOffset), lerp(y0, y1, .5));
            context.lineTo(lerp(x0, x1, .5), lerp(y0, y1, .5 + clickableOffset));
            context.lineTo(lerp(x0, x1, .5 + clickableOffset), lerp(y0, y1, .5));
            context.lineTo(lerp(x0, x1, .5), lerp(y0, y1, .5 - clickableOffset));
            context.closePath();
            context.stroke();
        }
    }

    context.restore();
}

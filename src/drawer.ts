import { Level, CellType, add, scale, levelNumber, getPlayerCoords } from "./internal";

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

export const PALETTE = ["#ffe47f", "#ffce68", "#ec9416", "#cc6308", "#733c14", "#28201b", "#413523", "#6f5935", "#927d66", "#bda292", "#d8c0ae", "#88e5d3", "#58d0ba", "#26cab2", "#18918e", "#17485c"] as const;
export const DESERT_PALETTE = ["#151244", "#60117f", "#922a95", "#be7dbc", "#350828", "#7f6962", "#f9cb60", "#f9960f", "#bc2f01", "#680703"] as const;

const notanTexture = await imageFromName('notan bird');
const playerTexture = await imageFromName('example');
const tileTexture = await imageFromName('tile');
/** size of the raw texture in pixels */
const cellTextureSize = 7;


let levelDrawer: Level;
/** ratio of the size of the drawn texture to the raw texture size */
let cellTextureRatio: number;
/** the size of the drawn texture in pixels */
let cellSize: number;
let textRatio: number;
/** the top left coordinates of the level in pixels; [x, y] */
let topLeft: number[];
export function initializeDrawer(levelAttr: Level) {
    levelDrawer = levelAttr;
}

/**
 * set cell size
 * @param canvasSize [width, height]
 * @param levelCenter [x, y]
 */
export function setCellSize(canvasSize: number[], levelCenter: number[]) {
    const textureHeightRatio: number = Math.floor(canvasSize[1] / (levelDrawer.size[0] + 1) / cellTextureSize);
    const textureWidthRatio: number = Math.floor(canvasSize[0] / (levelDrawer.size[1] + 1) / cellTextureSize);
    cellTextureRatio = Math.min(textureHeightRatio, textureWidthRatio);
    cellSize = cellTextureSize * cellTextureRatio;
    textRatio = cellTextureRatio;
    topLeft = [levelCenter[0] - cellSize * levelDrawer.size[1] / 2, levelCenter[1] - cellSize * levelDrawer.size[0] / 2].map((x) => Math.round(x));
}

function toRadian(x: number) { return x * Math.PI / 180; }



function drawTutorialText(context: CanvasRenderingContext2D, topLeft: number[]) {
    switch (levelNumber) {
        default:
            break;
    }
}

export function drawLevel(context: CanvasRenderingContext2D) {
    const margin = cellSize * .02;

    // draw cells
    context.strokeStyle = PALETTE[3];
    context.lineWidth = cellSize * .06;
    for (let row = 0; row < levelDrawer.size[0]; row++) {
        for (let column = 0; column < levelDrawer.size[1]; column++) {
            const cellType = levelDrawer.cells[row][column];
            switch (cellType) {
                case CellType.Empty:
                    continue;

                case CellType.Normal:
                    drawFloor(context, [row, column], false);
                    break;

                case CellType.Wall:
                    drawWall(context, [row, column]);
                    break;

                case CellType.Used:
                    drawFloor(context, [row, column], true);
                    break;
            }
        }
    }

    // draw tutorial text
    drawTutorialText(context, topLeft);

    // draw player
    drawPlayer(context, getPlayerCoords());
}

const BANNER_HEIGHT_RATIO = 1;
const BANNER_WIDTH_RATIO = 25;
const BANNER_GRADIENT_STEP_RATIO = .025;
const BANNER_DISTANCE_RATIO = 7.2;
const BANNER_FONT_SIZE_RATIO = .6;

// canvasSize is width, height
export function drawBannerMessage(context: CanvasRenderingContext2D, canvasSize: number[], levelCenter: number[]) {
    if (!levelDrawer.win) return;

    const bannerUnit = Math.min(canvasSize[1] * .06, cellSize * .75);
    const bannnerGradient = context.createLinearGradient(levelCenter[0] - bannerUnit * BANNER_WIDTH_RATIO / 2, 0, levelCenter[0] + bannerUnit * BANNER_WIDTH_RATIO / 2, 0);
    bannnerGradient.addColorStop(0, "rgb(40 32 27 / 0%)");
    bannnerGradient.addColorStop(BANNER_GRADIENT_STEP_RATIO, "rgb(40 32 27 / 10%)");
    bannnerGradient.addColorStop(BANNER_GRADIENT_STEP_RATIO * 2, "rgb(40 32 27 / 30%)");
    bannnerGradient.addColorStop(BANNER_GRADIENT_STEP_RATIO * 3, "rgb(40 32 27 / 60%)");
    bannnerGradient.addColorStop(BANNER_GRADIENT_STEP_RATIO * 4, PALETTE[5]);
    bannnerGradient.addColorStop(1 - BANNER_GRADIENT_STEP_RATIO * 4, PALETTE[5]);
    bannnerGradient.addColorStop(1 - BANNER_GRADIENT_STEP_RATIO * 3, "rgb(40 32 27 / 60%)");
    bannnerGradient.addColorStop(1 - BANNER_GRADIENT_STEP_RATIO * 2, "rgb(40 32 27 / 30%)");
    bannnerGradient.addColorStop(1 - BANNER_GRADIENT_STEP_RATIO, "rgb(40 32 27 / 10%)");
    bannnerGradient.addColorStop(1, "rgb(40 32 27 / 0%)");

    context.save();
    context.globalAlpha = .7;
    context.fillStyle = bannnerGradient;
    context.fillRect(levelCenter[0] - bannerUnit * BANNER_WIDTH_RATIO / 2, levelCenter[1] + bannerUnit * (-BANNER_DISTANCE_RATIO - BANNER_HEIGHT_RATIO / 2), bannerUnit * BANNER_WIDTH_RATIO, bannerUnit * BANNER_HEIGHT_RATIO);
    context.fillRect(levelCenter[0] - bannerUnit * BANNER_WIDTH_RATIO / 2, levelCenter[1] + bannerUnit * (BANNER_DISTANCE_RATIO - BANNER_HEIGHT_RATIO / 2), bannerUnit * BANNER_WIDTH_RATIO, bannerUnit * BANNER_HEIGHT_RATIO);

    context.globalAlpha = 1;
    context.fillStyle = PALETTE[10];
    context.font = `${bannerUnit * BANNER_FONT_SIZE_RATIO}px Recurso`;
    if (levelDrawer.win) {
        context.fillText("Level complete!", levelCenter[0], levelCenter[1] - bannerUnit * BANNER_DISTANCE_RATIO);
        context.fillText("HOLD     : previous level       HOLD     : next level", levelCenter[0], levelCenter[1] + bannerUnit * BANNER_DISTANCE_RATIO);
    }
    context.restore();
}

/**
 * draw level number etc.
 * @param context context
 * @param center center of the ui panel
 */
export function drawUi(context: CanvasRenderingContext2D, center: number[]) {
}

/**
 * 
 * @param context canvas context
 * @param sheetCoords [row, column]
 * @param tileTopLeft [x, y]
 */
function drawTileSlice(context: CanvasRenderingContext2D, sheetCoords: number[], tileTopLeft: number[]) {
    context.drawImage(tileTexture, cellTextureSize * sheetCoords[1], cellTextureSize * sheetCoords[0], cellTextureSize, cellTextureSize, tileTopLeft[0], tileTopLeft[1], cellSize, cellSize);
}

/**
 * draw wall tile
 * @param context canvas context
 * @param coords coordinates of the wall in the level; [row, column]
 */
function drawWall(context: CanvasRenderingContext2D, coords: number[]) {
    drawTileSlice(context, [0, (coords[0] + coords[1]) % 4], add(topLeft, scale(coords, cellSize).reverse()));
}

/**
 * draw floor tile
 * @param context canvas context
 * @param coords coordinates of the floor in the level; [row, column]
 */
function drawFloor(context: CanvasRenderingContext2D, coords: number[], isUsed: boolean) {
    drawTileSlice(context, [isUsed ? 2 : 1, isUsed ? 0 : ((coords[0] + coords[1]) % 4)], add(topLeft, scale(coords, cellSize).reverse()));
}

/**
 * draw player
 * @param context canvas context
 * @param coords coordinates of the player in the level; [row, column]; can have fractional coordinates
 */
function drawPlayer(context: CanvasRenderingContext2D, coords: Readonly<number[]>) {
    drawTileSlice(context, [2, 1], add(topLeft, scale(coords, cellTextureSize).reverse().map((x) => Math.round(x) * cellTextureRatio)));
}

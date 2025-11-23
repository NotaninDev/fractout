import { Level, timestepGlobal, add, scale, mainLevel, ZoomType, clamp, inputHandler, zoomCoords, Coordinates, setZoomCoords, updateZoomState } from "./internal";

class Animatable {
    readonly startTime: number;
    /** negative if the animation runs infinitely */
    readonly duration: number;
    constructor(startTime: number, duration: number) {
        this.startTime = startTime;
        this.duration = duration;
    }
    destruct() { }
}

export enum AnimationType {
    Zoom = 400
}

export const ZOOM_MILLISECONDS = 350;

/**
 * Zoom can have max 1 Animatable
 */
export const animationList: Record<AnimationType, Animatable[]> = {
    [AnimationType.Zoom]: []
} as const;

export function initAnimation() {
    for (const key in AnimationType) {
        if (isNaN(Number(key))) continue;
        const animationType = Number(key) as AnimationType;
        animationList[animationType].length = 0;
    }
}

export function updateAnimationList() {
    sortAnimationList();
    for (const key in AnimationType) {
        if (isNaN(Number(key))) continue;
        const animationType = Number(key) as AnimationType;

        for (let i = animationList[animationType].length - 1; i >= 0; i--) {
            const element = animationList[animationType][i];
            if (timestepGlobal > element.startTime + element.duration) {
                animationList[animationType][i].destruct();
                animationList[animationType].splice(i, 1);
            }
        }
    }

    // if zoom have 2+ animation, remove old ones
    if (animationList[AnimationType.Zoom].length > 1) {
        console.warn(`${animationList[AnimationType.Zoom].length} zoom animations registered`);
        animationList[AnimationType.Zoom] = animationList[AnimationType.Zoom].slice(-1);
    }
}

/**
 * util function; sort each array in `animationList` by the time the animation ends
 */
function sortAnimationList() {
    for (const key in AnimationType) {
        if (isNaN(Number(key))) continue;
        const animationType = Number(key) as AnimationType;

        animationList[animationType].sort(compareAnimationEnds);
    }
}

/**
 * util function; compare animatables
 */
function compareAnimationEnds(a: Animatable, b: Animatable) {
    if (a.duration < 0) {
        if (b.duration < 0) return -1;
        else return 1;
    }
    else if (b.duration < 0) return 1;
    else return (a.startTime + a.duration) - (b.startTime + b.duration);
}

/**
 * an animatable class which controls normal player move
 */
export class AnimationZoom extends Animatable {
    readonly zoomType: ZoomType;

    constructor(startTime: number, zoomType: ZoomType, childIndex: number | null) {
        super(startTime, ZOOM_MILLISECONDS);
        this.zoomType = zoomType;
        if ((zoomType === ZoomType.Out) !== (childIndex === null)) {
            console.warn(`can't have ${childIndex === null ? "null" : "non-null"} childIndex for zoom ${(ZoomType[zoomType]).toLowerCase()}`);
            return;
        }
        if (childIndex !== null) setZoomCoords(new Coordinates(zoomCoords.path.concat(childIndex)));
    }

    destruct(): void {
        if (this.zoomType === ZoomType.Out) setZoomCoords(new Coordinates(zoomCoords.path.slice(0, zoomCoords.path.length - 1)));
        updateZoomState();
        inputHandler.unblockInput();
    }

    getZoomRatio() {
        let t = clamp(0, 1, (timestepGlobal - this.startTime) / this.duration);
        return (this.zoomType === ZoomType.In) ? Math.sin(Math.PI / 2 * t) : (1 - Math.sin(Math.PI / 2 * t));
    }
}

/**
 * register zoom animation
 * @param zoomType zoom type
 * @param childIndex index of the brick child to zoom into for zoom-in type; null if zoom-out type
 */
export function registerZoomAnim(zoomType: ZoomType, childIndex: number | null) {
    if (animationList[AnimationType.Zoom].length > 0) {
        console.warn("can't register 2+ zoom animation at the same time");
        return;
    }
    animationList[AnimationType.Zoom].push(new AnimationZoom(timestepGlobal, zoomType, childIndex));
    inputHandler.blockInput();
}

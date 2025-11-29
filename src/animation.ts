import { Level, timestepGlobal, add, scale, mainLevel, ZoomType, clamp, inputHandler, zoomCoords, Coordinates, setZoomCoords, updateZoomState, usedZoom, getMessageCoordinates, Heart } from "./internal";

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
    Zoom = 400,
    DepthWarning,
    Heartbreak,
    Win,
}

export const CENTURY_MILLISECONDS = 1000 * 60 * 60 * 24 * 366 * 100;

/**
 * Zoom/DepthWarning/Win can have max 1 Animatable
 */
export const animationList: Record<AnimationType, Animatable[]> = {
    [AnimationType.Zoom]: [],
    [AnimationType.DepthWarning]: [],
    [AnimationType.Heartbreak]: [],
    [AnimationType.Win]: [],
} as const;

export function initAnimation() {
    for (const key in AnimationType) {
        if (isNaN(Number(key))) continue;
        const animationType = Number(key) as AnimationType;
        animationList[animationType].length = 0;
    }
    AnimationHeartbreak.heartToAnim.clear();
}

export function updateAnimationList() {
    sortAnimationList();
    for (const key in AnimationType) {
        if (isNaN(Number(key))) continue;
        const animationType = Number(key) as AnimationType;

        for (let i = animationList[animationType].length - 1; i >= 0; i--) {
            const element = animationList[animationType][i];
            if (element.duration >= 0 &&
                timestepGlobal > element.startTime + element.duration) {
                animationList[animationType][i].destruct();
                animationList[animationType].splice(i, 1);
            }
        }
    }

    // if zoom/depth-warning/win have 2+ animation, remove old ones
    if (animationList[AnimationType.Zoom].length > 1) {
        console.warn(`${animationList[AnimationType.Zoom].length} zoom animations registered`);
        animationList[AnimationType.Zoom] = animationList[AnimationType.Zoom].slice(-1);
    }
    if (animationList[AnimationType.DepthWarning].length > 1) {
        console.warn(`${animationList[AnimationType.DepthWarning].length} depth-warning animations registered`);
        animationList[AnimationType.DepthWarning] = animationList[AnimationType.DepthWarning].slice(-1);
    }
    if (animationList[AnimationType.Win].length > 1) {
        console.warn(`${animationList[AnimationType.Win].length} win animations registered`);
        animationList[AnimationType.Win] = animationList[AnimationType.Win].slice(-1);
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

export const ZOOM_MILLISECONDS = 350;

/**
 * zoom animation class
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

export const DEPTH_WARNING_MILLISECONDS = 1000;

/**
 * animation class of warning about clicking small bricks
 */
export class AnimationDepthWarning extends Animatable {
    readonly coords: Readonly<number[]>;
    /** whether the player has seen this animation */
    static seen: boolean = false;

    constructor(startTime: number, coords: Readonly<number[]>) {
        super(startTime, usedZoom && AnimationDepthWarning.seen ? DEPTH_WARNING_MILLISECONDS : -1);
        this.coords = coords;
    }

    destruct(): void {
        AnimationDepthWarning.seen = true;
    }
}

/**
 * register depth warning animation
 * @param coords absolute coordinates to display the warningtype
 */
export function registerDepthWarningAnim() {
    if (animationList[AnimationType.DepthWarning].length > 0) {
        console.warn("can't register 2+ depth warning animation at the same time");
        return;
    }
    animationList[AnimationType.DepthWarning].push(new AnimationDepthWarning(timestepGlobal, getMessageCoordinates()));
}

export function closeDepthWarning() {
    while (animationList[AnimationType.DepthWarning].length > 0) {
        const warningAnim = animationList[AnimationType.DepthWarning].pop() as AnimationDepthWarning;
        warningAnim.destruct();
    }
}

export const HEARTBREAK_MILLISECONDS = 250;

/**
 * heartbreak animation class
 */
export class AnimationHeartbreak extends Animatable {
    static readonly heartToAnim: Map<Heart, AnimationHeartbreak> = new Map();

    heart: Heart;

    constructor(startTime: number, heart: Heart) {
        super(startTime, -1);
        this.heart = heart;
        AnimationHeartbreak.heartToAnim.set(heart, this);
    }

    /** remove heartbreak animation associated to the given heart */
    static remove(heart: Heart) {
        for (let i = 0; i < animationList[AnimationType.Heartbreak].length; i++) {
            const heartbreakAnim = animationList[AnimationType.Heartbreak][i] as AnimationHeartbreak;
            if (heartbreakAnim.heart === heart) {
                animationList[AnimationType.Heartbreak].splice(i, 1);
                heartbreakAnim.destruct();
                break;
            }
        }
    }

    destruct(): void {
        AnimationHeartbreak.heartToAnim.delete(this.heart);
    }

    /**
     * get how far in time the animation has played
     * @returns time scale between [0, 1]
     */
    getTimeRatio() {
        const t = clamp(0, 1, (timestepGlobal - this.startTime) / HEARTBREAK_MILLISECONDS);
        return 1 - (1 - t) * (1 - t);
    }
}

/**
 * register heartbreak animation
 * @param heart heart to associate
 * @param skip whether to skip the animation to the end
 */
export function registerHeartbreakAnim(heart: Heart, skip: boolean) {
    AnimationHeartbreak.remove(heart);
    animationList[AnimationType.Heartbreak].push(new AnimationHeartbreak(skip ? -CENTURY_MILLISECONDS : timestepGlobal, heart));
}

export const WIN_SCORE_CYCLE_PERIOD_MILLISECONDS = 2000;
/** time to delay score heart animation per each heart above the animated heart */
export const WIN_SCORE_DELAY_MILLISECONDS = 60;
/** time it takes for a score heart to beat */
export const WIN_SCORE_BEAT_MILLISECONDS = 250;
export const WIN_MESSAGE_MILLISECONDS = 800;

/**
 * win message animation class
 */
export class AnimationWin extends Animatable {
    /** whether to skip win message animation */
    skip: boolean;
    /** time to delay win message animation */
    winMessageDelayMilliseconds: number;

    constructor(startTime: number, skip: boolean) {
        super(startTime, -1);
        this.skip = skip
        this.winMessageDelayMilliseconds = WIN_SCORE_DELAY_MILLISECONDS * (mainLevel.hearts.length - 1) + WIN_SCORE_BEAT_MILLISECONDS;
    }

    /** remove win animation */
    static remove() {
        while (animationList[AnimationType.Win].length > 0) {
            const winAnim = animationList[AnimationType.Win].pop() as AnimationWin;
            winAnim.destruct();
        }
    }

    /**
     * get the relative expansion size of the specified score heart
     * @param i index of the heart
     * @returns expansion scale between [0, 1]
     */
    getScoreBeatSizeRatio(i: number) {
        if (timestepGlobal < this.startTime + WIN_SCORE_DELAY_MILLISECONDS * i) return 0;
        const timeOffset = (timestepGlobal - (this.startTime + WIN_SCORE_DELAY_MILLISECONDS * i)) % WIN_SCORE_CYCLE_PERIOD_MILLISECONDS;
        const t = timeOffset <= WIN_SCORE_BEAT_MILLISECONDS ? (timeOffset / WIN_SCORE_BEAT_MILLISECONDS) : 0;
        return Math.sin(t * Math.PI);
    }

    /**
     * get how far in time the win message animation has played
     * @returns time scale between [0, 1]
     */
    getMessageTimeRatio() {
        if (this.skip) return 1;
        const t = clamp(0, 1, (timestepGlobal - (this.startTime + this.winMessageDelayMilliseconds)) / WIN_MESSAGE_MILLISECONDS);
        return 1 - (1 - t) * (1 - t);
    }
}

/**
 * register heartbreak animation
 * @param heart heart to associate
 * @param skipMessageAnimation whether to skip the win message animation to the end
 */
export function registerWinAnim(skipMessageAnimation: boolean) {
    if (animationList[AnimationType.Win].length > 0) {
        console.warn("can't register 2+ win animation at the same time");
        return;
    }
    animationList[AnimationType.Win].push(new AnimationWin(timestepGlobal, skipMessageAnimation));
}

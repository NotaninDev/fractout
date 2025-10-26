import { Direction, Level, timestepGlobal, add, scale, directionVectors, mainLevel } from "./internal";

class Animatable {
    readonly startTime: number;
    /** negative if the animation runs infinitely */
    readonly duration: number;
    constructor(startTime: number, duration: number) {
        this.startTime = startTime;
        this.duration = duration;
    }
}

export enum AnimationType {
    Move = 400,
    Stuck,
}

export const MOVE_MILLISECONDS = 150;
export const MOVE_ABORT_RATIO = .25;
export const STUCK_IN_PLACE_MILLISECONDS = 100;

/**
 * Move can have max 1 Animatable
 * Stuck can have max 1 Animatable
 */
const animationList: Record<AnimationType, Animatable[]> = {
    [AnimationType.Move]: [],
    [AnimationType.Stuck]: []
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
                animationList[animationType].splice(i, 1);
            }
        }
    }

    // if move/stuck have 2+ animation, remove old ones
    if (animationList[AnimationType.Move].length > 1) {
        console.warn(`${animationList[AnimationType.Move].length} move animations registered`);
        animationList[AnimationType.Move] = animationList[AnimationType.Move].slice(-1);
    }
    if (animationList[AnimationType.Stuck].length > 1) {
        console.warn(`${animationList[AnimationType.Stuck].length} move animations registered`);
        animationList[AnimationType.Stuck] = animationList[AnimationType.Stuck].slice(-1);
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

export function getPlayerAnimationType() {
    if (animationList[AnimationType.Move].length > 0) return AnimationType.Move;
    else if (animationList[AnimationType.Stuck].length > 0) return AnimationType.Stuck;
    else return null;
}

export function getPlayerCoords() {
    if (animationList[AnimationType.Move].length > 0) {
        const moveAnim = animationList[AnimationType.Move][0] as AnimationMove;
        const timeRatio = (timestepGlobal - moveAnim.startTime) / moveAnim.duration;
        return add(moveAnim.coords, scale(directionVectors[moveAnim.direction], Math.sin(timeRatio * Math.PI / 2)));
    }
    else if (animationList[AnimationType.Stuck].length > 0) {
        const stuckAnim = animationList[AnimationType.Stuck][0] as AnimationStuck;
        const timeRatio = (timestepGlobal - stuckAnim.startTime) / stuckAnim.duration;
        return stuckAnim.direction === null ?
            add(stuckAnim.coords, scale([Math.cos(timeRatio * Math.PI * 2), Math.sin(timeRatio * Math.PI * 2)], MOVE_ABORT_RATIO)) :
            add(stuckAnim.coords, scale(directionVectors[stuckAnim.direction], timeRatio * MOVE_ABORT_RATIO));
    }
    else return mainLevel.player.coords;
}

/**
 * an animatable class which controls normal player move
 */
class AnimationMove extends Animatable {
    readonly coords: readonly number[];
    /** the direction the player is moving in */
    readonly direction: Direction;

    constructor(startTime: number, coords: Readonly<number[]>, direction: Direction) {
        super(startTime, MOVE_MILLISECONDS);
        this.coords = Array.from(coords);
        this.direction = direction;
    }
}

/**
 * note: call this *before* updating the player coordinates
 */
export function registerMoveAnim(level: Level, direction: Direction) {
    if (animationList[AnimationType.Move].length > 0) {
        animationList[AnimationType.Move].length = 0;
    }
    animationList[AnimationType.Move].push(new AnimationMove(timestepGlobal, level.player.coords, direction));
}

/**
 * an animatable class which controls stuck player
 */
class AnimationStuck extends Animatable {
    readonly coords: readonly number[];
    /** the direction the player is moving in. `null` if player is stuck in place */
    readonly direction: Direction | null;

    constructor(startTime: number, duration: number, coords: Readonly<number[]>, direction: Direction | null) {
        super(startTime, duration);
        this.coords = Array.from(coords);
        this.direction = direction;
    }
}

export function registerStuckAnim(level: Level, direction: Direction | null) {
    if (animationList[AnimationType.Stuck].length > 0) {
        animationList[AnimationType.Stuck].length = 0;
    }
    animationList[AnimationType.Stuck].push(new AnimationStuck(timestepGlobal, direction === null ? STUCK_IN_PLACE_MILLISECONDS : (MOVE_MILLISECONDS * MOVE_ABORT_RATIO * 2), level.player.coords, direction));
}

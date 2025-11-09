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
    Break = 400
}

export const MOVE_MILLISECONDS = 150;
export const MOVE_ABORT_RATIO = .25;
export const STUCK_IN_PLACE_MILLISECONDS = 100;

/**
 * ??? can have max 1 Animatable
 */
const animationList: Record<AnimationType, Animatable[]> = {
    [AnimationType.Break]: []
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

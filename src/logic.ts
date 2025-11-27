import { AnimationHeartbreak, animationList, AnimationType, AnimationWin, closeDepthWarning, getUiButtonClick, initialState, InputHandler, inputHandler, lerp, LevelTemplate, registerDepthWarningAnim, registerHeartbreakAnim, registerWinAnim, setZoomCoords, UiButtonType, updateAnimationList, updateZoomState, zoomCoords } from "./internal";

export enum Direction {
    Up = 0,
    Right,
    Down,
    Left
}
export function getOpposite(direction: Direction) { return ((direction + 2) % 4) as Direction; }

interface Clonable<T> {
    clone(): T;
}

/**
 * 
 * @param vectors arrays of length-2
 * @returns new array of sum of vectors
 */
export function add(...vectors: readonly Readonly<number[]>[]): number[] {
    const accumulator: number[] = [0, 0];
    vectors.forEach((vector) => {
        accumulator[0] += vector[0];
        accumulator[1] += vector[1];
    })
    return accumulator;
}
/**
 * 
 * @param vector input
 * @param k scaler
 * @returns new array of scaled vector
 */
export function scale(vector: Readonly<number[]>, k: number): number[] {
    const vCopy = Array.from(vector);
    for (const i in vector) {
        vCopy[i] *= k;
    }
    return vCopy;
}
export function equals(v1: Readonly<number[]>, v2: Readonly<number[]>): boolean {
    if (v1.length != v2.length) return false;
    for (let i = 0; i < v1.length; i++) {
        if (v1[i] !== v2[i]) return false;
    }
    return true;
}
export function weave<Type>(...vectors: Type[][]): Type[] {
    const accumulator: Type[] = [];
    const maxSize = vectors.map(x => x.length).reduce((currentMax, x) => Math.max(currentMax, x), 0);
    for (let i = 0; i < maxSize; i++) {
        for (const vector of vectors) {
            if (i < vector.length) accumulator.push(vector[i]);
        }
    }
    return accumulator;
}

function generateRandomArray(size: number, rangeMin: number = 0, rangeMax: number = 1): number[] {
    const results: number[] = [];
    for (let i = 0; i < size; i++) {
        results.push(lerp(rangeMin, rangeMax, Math.random()));
    }
    return results;
}


/**
 * counting root brick as 0.
 * if the max depth is set to 9, the game needs at least 512px with each smallest brick size set to 1px.
 */
export const BRICK_MAX_DEPTH = 5;

export class Brick {
    readonly coords: Coordinates;
    /** 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right */
    holeIndex: number | null;
    parent: Brick | null;
    /** top-left, top-right, bottom-left, bottom-right */
    readonly children: (Brick | null)[];

    constructor(coords: Coordinates, parent: Brick | null) {
        this.coords = coords;
        this.holeIndex = null;
        this.parent = parent;
        this.children = [null, null, null, null];
    }

    isIntact() {
        return this.holeIndex === null;
    }

    /**
     * break this brick
     * @param breakIndex the index of a new hole
     * @returns whether breaking succeeded
     */
    break(breakIndex: number) {
        if (breakIndex < 0 || breakIndex >= 4) {
            console.error(`invalid breakIndex ${breakIndex}`);
            return false;
        }
        if (!this.isIntact()) {
            console.error(`cannot break; has a hole in ${getPositionString(this.holeIndex)}`);
            return false;
        }
        for (let i = 0; i < this.children.length; i++) {
            if (i === breakIndex) continue;
            const childBrick = new Brick(new Coordinates(this.coords.path.concat(i)), this);
            this.children[i] = childBrick;
        }
        this.holeIndex = breakIndex;
        return true;
    }

    /**
     * undo breaking this brick
     * @param force force unbreaking this brick
     */
    unbreak(force: boolean = false) {
        if (!force) {
            if (this.isIntact()) {
                console.error("this brick is intact");
                return;
            }
            for (let i = 0; i < this.children.length; i++) {
                if (i === this.holeIndex) continue;
                if (!this.children[i]?.isIntact()) {
                    console.error(`child ${getPositionString(i)} is broken`);
                    return;
                }
            }
        }

        for (let i = 0; i < this.children.length; i++) {
            this.children[i] = null;
        }
        this.holeIndex = null;
    }
}

function getPositionString(i: number | null) {
    switch (i) {
        case 0:
            return "top-left";
        case 1:
            return "top-right";
        case 2:
            return "bottom-left";
        case 3:
            return "bottom-right";
        default:
            return "invalid";
    }
}

export class Coordinates {
    /** 0-length array means the root, i.e. the first brick you would break. */
    readonly path: Readonly<number[]>;
    constructor(path: Readonly<number[]>) {
        this.path = Array.from(path);
    }

    isEqual(otherCoords: Coordinates) {
        if (this.path.length != otherCoords.path.length) return false;
        for (let i = 0; i < this.path.length; i++) {
            if (this.path[i] != otherCoords.path[i]) return false;
        }
        return true;
    }

    /** compares if this is a strict ancestor of `otherCoords`; can't be equal */
    isAncestorOf(otherCoords: Coordinates) {
        if (this.path.length >= otherCoords.path.length) return false;
        for (let i = 0; i < this.path.length; i++) {
            if (this.path[i] != otherCoords.path[i]) return false;
        }
        return true;
    }

    /** compares if this is a strict decendant of `otherCoords`; can't be equal */
    isDecendantOf(otherCoords: Coordinates) {
        if (this.path.length <= otherCoords.path.length) return false;
        for (let i = 0; i < otherCoords.path.length; i++) {
            if (this.path[i] != otherCoords.path[i]) return false;
        }
        return true;
    }
}

export enum HeartState {
    Hidden = 100,
    Found,
    Broken
}

export class Heart {
    readonly coords: Coordinates;
    state: HeartState;

    constructor(coords: Coordinates) {
        this.coords = coords;
        this.state = HeartState.Hidden;
    }

    /**
     * @returns whether this heart's win condition is satisfied
     */
    isSatisfied() {
        return this.state === HeartState.Found || this.state === HeartState.Broken;
    }
}

export class Level {
    rootBrick: Brick;
    readonly hearts!: Readonly<Heart[]>;
    /** map from a brick to the s of its clickable children */
    clickables: Map<Coordinates, Readonly<number[]>>;
    /**
     * map of bricks to list of hearts drawn on them. this is a cache.
     * */
    heartParents: Map<Brick, Heart[]>;
    /** initial zoomCoords *within a turn*, not in this level's initial state */
    initialZoomCoords: Coordinates;

    /** tracks if any moves were made since the initial state */
    moved: boolean;
    win: boolean;
    undoStack: StateStack;
    redoStack: StateStack;

    constructor(template: LevelTemplate) {
        this.hearts = template.hearts.map(coords => new Heart(coords));

        this.rootBrick = new Brick(new Coordinates([]), null);
        this.clickables = new Map();
        this.clickables.set(this.rootBrick.coords, [0, 1, 2, 3]);
        this.heartParents = new Map();
        this.updateHeartState(true);
        this.initialZoomCoords = new Coordinates([]);
        setZoomCoords(this.initialZoomCoords);

        this.win = false;
        this.moved = false;
        this.undoStack = new StateStack(this);
        this.redoStack = new StateStack(this);
    }

    /**
     * @param rawCoords coordinates in the root brick scaled to [0, 1] on both axes; [x, y]
     * @returns whether `rawCoords` is inside the level
     */
    inMap(rawCoords: Readonly<number[]>) {
        return rawCoords[0] >= 0 && rawCoords[0] <= 1 && rawCoords[1] >= 0 && rawCoords[1] <= 1;
    }

    /**
     * converts raw coordinates to brick coordinates.
     * @param rawCoords coordinates in the root brick scaled to [0, 1] on both axes; [x, y]
     * @returns brick coordinates of the child of the now-intact brick, if such brick exists. null otherwise.
     */
    toChildBrickCoords(rawCoords: Readonly<number[]>) {
        if (!this.inMap(rawCoords)) return null;

        // get the zoomed-in brick
        let currentBrick: Brick | null = this.rootBrick;
        const brickPath = [];
        for (let i = 0; i < zoomCoords.path.length && currentBrick !== null; i++) {
            currentBrick = currentBrick.children[zoomCoords.path[i]];
            brickPath.push(zoomCoords.path[i]);
        }

        // get the clicked brick
        let scaledCoords = Array.from(rawCoords);
        while (currentBrick !== null && brickPath.length < zoomCoords.path.length + BRICK_MAX_DEPTH) {
            const isLeft = scaledCoords[0] < .5;
            const isUp = scaledCoords[1] < .5;
            const childIndex = (isLeft ? 0 : 1) + (isUp ? 0 : 2);
            currentBrick = currentBrick.children[childIndex];
            scaledCoords[0] = scaledCoords[0] * 2 - (isLeft ? 0 : 1);
            scaledCoords[1] = scaledCoords[1] * 2 - (isUp ? 0 : 1);
            brickPath.push(childIndex);
        }
        return new Coordinates(brickPath);
    }

    /**
     * get brick by coordinates. returns `null` if invalid coordinates is given.
     */
    getBrickByCoords(coords: Coordinates) {
        let currentBrick: Brick | null = this.rootBrick;
        for (let i = 0; i < coords.path.length && currentBrick !== null; i++) {
            currentBrick = currentBrick.children[coords.path[i]];
        }
        return currentBrick;
    }

    /**
     * get the youngest existing ancestor brick of the brick located at the given coordinates.
     */
    getAncestorBrickByCoords(coords: Coordinates) {
        let currentBrick: Brick = this.rootBrick;
        for (let i = 0; i < coords.path.length; i++) {
            const nextBrick = currentBrick.children[coords.path[i]];
            if (nextBrick === null) break;
            currentBrick = nextBrick;
        }
        return currentBrick;
    }

    /**
     * get all bricks and their clickable children when the brick at the given coordinates is clicked
     * @param clickCoords the coordinates to get neighboring bricks of
     * @returns map from brick to its clickable children's indices
     */
    getClickablesFromClickCoords(clickCoords: Coordinates) {

        // there are two types of adjucency:
        // - neighbors' click-sided decendants
        // - neighbors' ancestors, excluding common ancestors

        function canAdd(x: number, diff: number) {
            const y = x + diff;
            return y >= 0 && y < 4 && x + y != 3;
        }
        const directionOffsets = [-2, +1, +2, -1];
        const clickables: Map<Coordinates, Readonly<number[]>> = new Map();
        for (let direction = 0; direction < directionOffsets.length; direction++) {
            const newPath = Array.from(clickCoords.path);
            const offset = directionOffsets[direction];
            let invalidAddition = true;
            for (let i = newPath.length - 1; i >= 0; i--) {
                if (canAdd(newPath[i], offset)) {
                    newPath[i] += offset;
                    invalidAddition = false;
                    break;
                }
                newPath[i] -= offset;
            }
            if (invalidAddition) continue;

            const newCoords = new Coordinates(newPath);

            // neighbor's ancestor
            const neighborBrick = this.getAncestorBrickByCoords(newCoords);
            const neighborCoords = neighborBrick.coords;
            if (neighborCoords.isAncestorOf(clickCoords)) continue;
            if (!neighborCoords.isEqual(newCoords)) {
                clickables.set(neighborCoords, [newPath[neighborCoords.path.length]]);
                continue;
            }

            // neighbor's decendants
            const validChildIndices: number[] = [];
            const decendantStack: Brick[] = [neighborBrick];
            switch (direction) {
                case 0:
                    validChildIndices.push(2);
                    validChildIndices.push(3);
                    break;
                case 1:
                    validChildIndices.push(0);
                    validChildIndices.push(2);
                    break;
                case 2:
                    validChildIndices.push(0);
                    validChildIndices.push(1);
                    break;
                case 3:
                    validChildIndices.push(1);
                    validChildIndices.push(3);
                    break;
            }
            while (decendantStack.length > 0) {
                const currentDecendant = decendantStack.pop() as Brick;
                if (currentDecendant.isIntact()) {
                    clickables.set(currentDecendant.coords, validChildIndices);
                    continue;
                }
                for (let i = 0; i < validChildIndices.length; i++) {
                    const nextDecendant = currentDecendant.children[validChildIndices[i]];
                    if (nextDecendant !== null) {
                        decendantStack.push(nextDecendant);
                    }
                }
            }
        }
        return clickables;
    }

    /**
     * get clickable indices of the brick at the given coordinates. you need to use this function instead of `Level.clickable.get` because two different `Coordinates` objects are evaluated to no equal even if they represent the same coordinates in the game.
     * it takes `O(n)` where `n` is the size of `this.clickables`.
     * @param coords coordinates of the brick
     * @returns clickable indices if some of the child indices of the brick at the coordinates are clickable. `null` otherwise.
     */
    getClickableIndicesByCoords(coords: Coordinates) {
        for (const [clickableCoords, childIndece] of this.clickables) {
            if (coords.isEqual(clickableCoords)) {
                return childIndece;
            }
        }
        return null;
    }

    /**
     * @param brick brick
     * @returns whether the given brick cannot be clicked because of hearts
     */
    getBlockedByHeart(brick: Brick) {
        return this.heartParents.has(brick) && this.heartParents.get(brick)!.some((heart) => heart.state === HeartState.Found);
    }

    updateState() {
        updateAnimationList();

        if (inputHandler.mouseDownEventUnused && inputHandler.mouseButton === 0) {
            if (inputHandler.levelCoords !== null && !this.win) {
                if (this.inMap(inputHandler.levelCoords)) {
                    if (animationList[AnimationType.DepthWarning].length > 0) {
                        inputHandler.mouseDownEventUnused = false;
                        closeDepthWarning();
                    }
                    else {
                        const clickCoords = this.toChildBrickCoords(inputHandler.levelCoords);
                        if (clickCoords !== null) {
                            inputHandler.mouseDownEventUnused = false;
                            const clickedBrick = this.getBrickByCoords(new Coordinates(clickCoords.path.slice(0, -1)));
                            if (clickedBrick !== null) {
                                let rejectDepth = false;
                                for (const [clickableCoords, _] of this.clickables) {
                                    if (clickableCoords.isEqual(clickCoords) || clickableCoords.isDecendantOf(clickCoords)) {
                                        rejectDepth = true;
                                        break;
                                    }
                                }
                                if (rejectDepth) {
                                    registerDepthWarningAnim();
                                }
                                else if (clickedBrick.isIntact() &&
                                    this.getClickableIndicesByCoords(clickedBrick.coords)?.includes(clickCoords.path[clickCoords.path.length - 1])) {
                                    if (!this.getBlockedByHeart(clickedBrick)) {
                                        if (clickedBrick.break(clickCoords.path[clickCoords.path.length - 1])) {
                                            if (!this.moved) {
                                                this.undoStack.nextDiff.moved = this.moved;
                                            }
                                            this.undoStack.nextDiff.unbreakCoords = [clickedBrick.coords];
                                            this.undoStack.nextDiff.clickables = this.clickables;
                                            if (!this.initialZoomCoords.isEqual(zoomCoords)) {
                                                this.undoStack.nextDiff.initialZoomCoords = this.initialZoomCoords;
                                            }
                                            this.undoStack.commit();
                                            this.redoStack.clear();

                                            this.moved = true;
                                            this.clickables = this.getClickablesFromClickCoords(clickCoords);
                                            this.initialZoomCoords = zoomCoords;
                                            this.updateWin(false);
                                            updateZoomState();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (inputHandler.mouseDownEventUnused) {
                switch (getUiButtonClick()) {
                    case UiButtonType.Undo:
                        if (this.canUndo()) {
                            const diff = this.undoStack.pop() as StateDiff;
                            this.redoStack.nextDiff = this.reverseDiff(diff);
                            this.redoStack.commit();
                            this.applyDiff(diff);
                            this.updateWin(true);

                            setZoomCoords(this.initialZoomCoords);
                            updateZoomState();
                            closeDepthWarning();
                        }
                        break;
                    case UiButtonType.Redo:
                        if (this.canRedo()) {
                            const diff = this.redoStack.pop() as StateDiff;
                            this.undoStack.nextDiff = this.reverseDiff(diff);
                            this.undoStack.commit();
                            this.applyDiff(diff);
                            this.updateWin(true);

                            setZoomCoords(this.initialZoomCoords);
                            updateZoomState();
                            closeDepthWarning();
                        }
                        break;
                    case UiButtonType.Reset:
                        if (this.canRestart()) {
                            this.undoStack.nextDiff.moved = this.moved;
                            getSortedBrokenBricks(this.rootBrick).forEach(brick => {
                                if (brick.isIntact()) {
                                    console.warn(`brick at ${brick.coords.path} is not broken`);
                                    return;
                                }
                                this.undoStack.nextDiff.breakCoords.set(brick.coords, brick.holeIndex as number);
                            });
                            this.undoStack.nextDiff.clickables = this.clickables;
                            if (zoomCoords.path.length > 0) {
                                this.undoStack.nextDiff.initialZoomCoords = zoomCoords;
                            }

                            this.undoStack.commit();
                            this.redoStack.clear();

                            this.moved = false;
                            this.rootBrick = new Brick(new Coordinates([]), null);
                            this.clickables = new Map();
                            this.clickables.set(this.rootBrick.coords, [0, 1, 2, 3]);
                            this.updateWin(true);

                            this.initialZoomCoords = new Coordinates([]);
                            setZoomCoords(this.initialZoomCoords);
                            updateZoomState();
                            closeDepthWarning();
                        }
                        break;
                }
            }
        }
    }

    /**
     * update heart states and map cache of bricks to lists of hearts
     * @param skipAnimation whether to skip animation
     */
    private updateHeartState(skipAnimation: boolean) {
        this.heartParents.clear();
        for (const heart of this.hearts) {
            const oldState = heart.state;
            const brick = this.getAncestorBrickByCoords(heart.coords);
            if (brick.coords.isEqual(heart.coords)) {
                heart.state = HeartState.Found;
            }
            else {
                if (brick.coords.path.length >= heart.coords.path.length) {
                    console.warn("failed to get brick of heart ", heart.coords.path);
                    continue;
                }
                if (brick.holeIndex === heart.coords.path[brick.coords.path.length]) {
                    heart.state = HeartState.Broken;
                }
                else if (brick.isIntact()) {
                    heart.state = HeartState.Hidden;
                }
                else {
                    console.warn("invalid path for heart", heart.coords.path);
                    continue;
                }
            }
            if (!this.heartParents.has(brick)) {
                this.heartParents.set(brick, []);
            }
            this.heartParents.get(brick)!.push(heart);

            if (oldState === HeartState.Hidden && heart.state === HeartState.Broken) {
                registerHeartbreakAnim(heart, skipAnimation);
            }
            else if (oldState === HeartState.Broken && heart.state === HeartState.Hidden) {
                AnimationHeartbreak.remove(heart);
            }
        }
    }

    /**
     * update win state
     * @param skipAnimation whether to skip animation
     */
    private updateWin(skipAnimation: boolean) {
        const oldWin = this.win;
        this.updateHeartState(skipAnimation);
        this.win = this.hearts.length > 0 && this.hearts.every(heart => heart.isSatisfied());
        if (!oldWin && this.win) registerWinAnim(skipAnimation);
        else if (oldWin && !this.win) AnimationWin.remove();
    }

    canUndo() {
        return this.undoStack.hasDiffs();
    }

    canRedo() {
        return this.redoStack.hasDiffs();
    }

    canRestart() {
        return this.moved;
    }

    applyDiff(diff: StateDiff) {
        if (diff.moved !== undefined) {
            this.moved = diff.moved;
        }

        if (diff.breakCoords !== undefined) {
            for (const [coords, childIndex] of diff.breakCoords) {
                const brick = this.getBrickByCoords(coords);
                if (brick === null) {
                    console.warn("brick doesn't exist at", coords.path);
                    continue;
                }
                if (!brick.break(childIndex)) {
                    console.warn("failed to break brick at", coords.path);
                    continue;
                }
            }
        }

        if (diff.unbreakCoords !== undefined) {
            for (let i = 0; i < diff.unbreakCoords.length; i++) {
                const currentBrick = this.getBrickByCoords(diff.unbreakCoords[i]);
                if (currentBrick === null) {
                    console.warn("brick doesn't exist at", diff.unbreakCoords[i].path);
                    continue;
                }
                currentBrick.unbreak();
            }
        }

        if (diff.clickables !== undefined) {
            this.clickables = diff.clickables;
        }

        if (diff.initialZoomCoords !== undefined) {
            this.initialZoomCoords = diff.initialZoomCoords;
            setZoomCoords(this.initialZoomCoords);
        }
    }

    reverseDiff(diff: StateDiff): StateDiff {
        const reverseDiff = new StateDiff();

        if (diff.moved !== undefined) {
            reverseDiff.moved = this.moved;
        }

        if (diff.breakCoords !== undefined) {
            const unbreakCoords = [];
            for (const [coords, _] of diff.breakCoords) {
                unbreakCoords.push(coords);
            }
            unbreakCoords.reverse();
            reverseDiff.unbreakCoords = unbreakCoords;
        }

        if (diff.unbreakCoords !== undefined) {
            for (let i = diff.unbreakCoords.length - 1; i >= 0; i--) {
                const currentUnbreakCoords = diff.unbreakCoords[i];
                const brokenBrick = this.getBrickByCoords(currentUnbreakCoords);
                if (brokenBrick === null) {
                    console.warn("brick doesn't exist at", currentUnbreakCoords.path);
                    continue;
                }
                if (brokenBrick.isIntact()) {
                    console.warn("can't break brick at", currentUnbreakCoords.path);
                    continue;
                }
                reverseDiff.breakCoords.set(brokenBrick.coords, brokenBrick.holeIndex as number);
            }
        }

        if (diff.clickables !== undefined) {
            reverseDiff.clickables = this.clickables;
        }

        if (diff.initialZoomCoords !== undefined) {
            reverseDiff.initialZoomCoords = this.initialZoomCoords;
        }

        return reverseDiff;
    }
}

function isDirection(x: any): x is Direction {
    return typeof x === "number" && x in Direction;
}

/**
 * get all broken bricks recursively in the subtree rooted at the given brick. for any pair of bricks in the same lineage, the ancestor appears earlier than the decendant in the results.
 * @param currentBrick brick
 * @returns sorted list of all broken bricks
 */
function getSortedBrokenBricks(currentBrick: Brick) {
    let sortedBricks: Brick[] = [];
    if (currentBrick.isIntact()) return [];
    sortedBricks.push(currentBrick);
    for (let i = 0; i < currentBrick.children.length; i++) {
        const childBrick = currentBrick.children[i];
        if (childBrick !== null) {
            sortedBricks = sortedBricks.concat(getSortedBrokenBricks(childBrick));
        }
    }
    return sortedBricks;
}

class StateDiff {
    moved?: boolean;
    /** coords need to be processed in order */
    breakCoords: Map<Coordinates, number>;
    /** coords need to be processed in order */
    unbreakCoords: Readonly<Coordinates[]>;
    clickables?: Map<Coordinates, Readonly<number[]>>;
    initialZoomCoords?: Coordinates;
    constructor() {
        this.breakCoords = new Map();
        this.unbreakCoords = [];
    }
}

class StateStack {
    level: Level;
    stateDiffs: StateDiff[];
    nextDiff: StateDiff;
    constructor(level: Level) {
        this.level = level;
        this.stateDiffs = [];
        this.nextDiff = new StateDiff();
    }

    /**
     * Push all changes registered on nextDiff to the stack.
     * Rejected if nextDiff is empty.
     */
    commit() {
        if ([this.nextDiff.moved, this.nextDiff.clickables, this.nextDiff.initialZoomCoords].some(x => x !== undefined) || this.nextDiff.breakCoords.size > 0 || this.nextDiff.unbreakCoords.length > 0) {
            this.stateDiffs.push(this.nextDiff);
        }
        this.nextDiff = new StateDiff();
    }

    pop(): StateDiff | undefined {
        if (this.stateDiffs.length == 0) {
            console.error("can't pop a stateDiff; the state stack is empty");
        }
        return this.stateDiffs.pop();
    }

    /**
     * @returns true if 1 or more stateDiffs are registered
     */
    hasDiffs() {
        return this.stateDiffs.length > 0;
    }

    clear() {
        this.stateDiffs = [];
    }
}

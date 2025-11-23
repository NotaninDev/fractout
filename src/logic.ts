import { initialState, InputHandler, inputHandler, lerp, LevelTemplate, updateAnimationList, updateZoomState, zoomCoords } from "./internal";

export const CENTURY_MILLISECONDS = 1000 * 60 * 60 * 24 * 366 * 100;

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
        if (this.coords.path.length >= zoomCoords.path.length + BRICK_MAX_DEPTH) {
            // todo: register zoom warning animation
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

export class Target {
    readonly level: Level;
    readonly coords: Coordinates;

    constructor(level: Level, coords: Coordinates) {
        this.level = level;
        this.coords = coords;
    }

    /**
     * tbd
     * @returns whether this target's condition is satisfied
     */
    isSatisfied() {
        return false;
    }
}

export class Level {
    rootBrick: Brick;
    readonly targets!: Readonly<Target[]>;
    /** map from a brick to the indice of its clickable children */
    clickables: Map<Brick, Readonly<number[]>>;

    /** tracks if any moves were made since the initial state */
    moved: boolean;
    win: boolean;
    undoStack: StateStack;
    redoStack: StateStack;

    constructor(template: LevelTemplate) {
        this.targets = template.targets.map(coords => new Target(this, coords));

        this.rootBrick = new Brick(new Coordinates([]), null);
        this.clickables = new Map();
        this.clickables.set(this.rootBrick, [0, 1, 2, 3]);

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
        while (currentBrick !== null) {
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
     * @returns map from brick to its clickable children's indice
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
        const clickables: Map<Brick, Readonly<number[]>> = new Map();
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
                clickables.set(neighborBrick, [newPath[neighborCoords.path.length]]);
                continue;
            }

            // neighbor's decendants
            const validChildIndice: number[] = [];
            const decendantStack: Brick[] = [neighborBrick];
            switch (direction) {
                case 0:
                    validChildIndice.push(2);
                    validChildIndice.push(3);
                    break;
                case 1:
                    validChildIndice.push(0);
                    validChildIndice.push(2);
                    break;
                case 2:
                    validChildIndice.push(0);
                    validChildIndice.push(1);
                    break;
                case 3:
                    validChildIndice.push(1);
                    validChildIndice.push(3);
                    break;
            }
            while (decendantStack.length > 0) {
                const currentDecendant = decendantStack.pop() as Brick;
                if (currentDecendant.isIntact()) {
                    clickables.set(currentDecendant, validChildIndice);
                    continue;
                }
                for (let i = 0; i < validChildIndice.length; i++) {
                    const nextDecendant = currentDecendant.children[validChildIndice[i]];
                    if (nextDecendant !== null) {
                        decendantStack.push(nextDecendant);
                    }
                }
            }
        }
        return clickables;
    }

    updateState() {
        updateAnimationList();

        if (inputHandler.mouseDownEventUnused) {

            if (inputHandler.mouseButton === 0 && inputHandler.levelCoords !== null) {
                const clickCoords = this.toChildBrickCoords(inputHandler.levelCoords);
                if (clickCoords !== null) {
                    inputHandler.mouseDownEventUnused = false;
                    const clickedBrick = this.getBrickByCoords(new Coordinates(clickCoords.path.slice(0, -1)));
                    if (clickedBrick !== null && clickedBrick.isIntact() &&
                        this.clickables.get(clickedBrick)?.includes(clickCoords.path[clickCoords.path.length - 1])) {
                        if (clickedBrick.break(clickCoords.path[clickCoords.path.length - 1])) {
                            this.clickables = this.getClickablesFromClickCoords(clickCoords);
                            // todo: push to undoStack

                            updateZoomState();
                        }
                    }
                }
            }
        }
        else if (inputHandler.keyDownEventUnused) {
            inputHandler.keyDownEventUnused = false;

            if (inputHandler.currentKey === InputHandler.KeyName.Undo) {
                if (this.undoStack.hasDiffs()) {
                    const diff = this.undoStack.pop();
                    if (diff !== undefined) {
                        this.redoStack.nextDiff = this.reverseDiff(diff);
                        this.redoStack.commit();
                        this.applyDiff(diff);
                        this.updateWin();
                    }
                }
            }
            else if (inputHandler.currentKey === InputHandler.KeyName.Redo) {
                if (this.redoStack.hasDiffs()) {
                    const diff = this.redoStack.pop();
                    if (diff !== undefined) {
                        this.undoStack.nextDiff = this.reverseDiff(diff);
                        this.undoStack.commit();
                        this.applyDiff(diff);
                        this.updateWin();
                    }
                }
            }
            else if (inputHandler.currentKey === InputHandler.KeyName.Restart) {
                if (this.moved) {
                    this.undoStack.nextDiff.moved = this.moved;
                    this.moved = false;

                    // todo: record current state and reset

                    this.undoStack.commit();
                    this.redoStack.clear();
                    this.win = false;
                }
            }
        }
    }

    /**
     * update win state
     */
    private updateWin() {
        console.warn("`updateWin` is not functional yet");
        this.win = this.targets.every(target => target.isSatisfied());
    }

    private restoreCleanState() {
        this.undoStack.commit();

        // i don't see how committing redoStack can be useful, but just in case
        this.redoStack.commit();
    }

    applyDiff(diff: StateDiff) {
        if (diff.moved !== undefined) {
            this.moved = diff.moved;
        }

        // if (diff.getPlayerCoords() !== undefined) {
        //     this.player.coords = diff.getPlayerCoords() as readonly number[];
        // }

        // for (const [coords, cellType] of diff.cells) {
        //     this.cells[coords[0]][coords[1]] = cellType;
        // }
    }

    reverseDiff(diff: StateDiff): StateDiff {
        const reverseDiff = new StateDiff();

        if (diff.moved !== undefined) {
            reverseDiff.moved = this.moved;
        }

        // if (diff.getPlayerCoords() !== undefined) {
        //     reverseDiff.setPlayerCoords(this.player.coords);
        // }

        // for (const [coords, _] of diff.cells) {
        //     reverseDiff.pushCell(coords, this.cells[coords[0]][coords[1]]);
        // }

        return reverseDiff;
    }
}

function isDirection(x: any): x is Direction {
    return typeof x === "number" && x in Direction;
}

class StateDiff {
    moved?: boolean;
    constructor() {
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
        if ([this.nextDiff.moved].some(x => x !== undefined)) {
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

import { initialState, InputHandler, inputHandler, lerp, levelNumber, LevelTemplate, mainLevel, mainLevels, registerMoveAnim, registerStuckAnim, updateAnimationList } from "./internal";

export const CENTURY_MILLISECONDS = 1000 * 60 * 60 * 24 * 366 * 100;

export enum Direction {
    Up = 0,
    Right,
    Down,
    Left
}
export const directionVectors = [[-1, 0] as const, [0, 1] as const, [1, 0] as const, [0, -1] as const] as const;
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

export enum CellType {
    Empty = 200,
    Normal,
    Used,
    Wall,
}

export class Player implements Clonable<Player> {
    /** [row, column] */
    coords: Readonly<number[]>;

    constructor(template: PlayerTemplate) {
        this.coords = Array.from(template.coords);
    }

    clone(): Player {
        const clonedPlayer = new Player(new PlayerTemplate(
            Array.from(this.coords)
        ));
        return clonedPlayer;
    }
}
export class PlayerTemplate {
    /** [row, column] */
    readonly coords: Readonly<number[]>;

    constructor(coords: number[]) {
        this.coords = coords;
    }
}

export class Level {
    title!: string;
    /** [row, column] */
    size!: number[];
    /** row, column */
    cells!: CellType[][];
    player!: Player;

    moved: boolean;
    win: boolean;
    undoStack: StateStack;
    redoStack: StateStack;

    constructor(template: LevelTemplate) {
        this.loadLevel(template);

        this.win = false;
        this.moved = false;
        this.undoStack = new StateStack(this);
        this.redoStack = new StateStack(this);
    }

    private loadLevel(template: LevelTemplate) {
        this.title = template.title;
        this.size = Array.from(template.size);
        this.cells = Array.from(template.cells, row => Array.from(row));
        this.player = new Player(template.player).clone();
    }

    inMap(coords: Readonly<number[]>) {
        return coords[0] > 0 && coords[0] < this.size[0] - 1 && coords[1] > 0 && coords[1] < this.size[1] - 1;
    }

    updateState() {
        updateAnimationList();

        if (inputHandler.keyDownEventUnused) {
            inputHandler.keyDownEventUnused = false;
            const direction = inputHandler.getCurrentDirection();
            if (direction !== undefined) {
                this.attemptMove(direction);
            }
            else if (inputHandler.currentKey === InputHandler.KeyName.Undo) {
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
                    if (this.player.coords !== initialState.player.coords) {
                        this.undoStack.nextDiff.setPlayerCoords(this.player.coords);
                        this.player.coords = initialState.player.coords;
                    }
                    for (let row = 0; row < this.size[0]; row++) {
                        for (let column = 0; column < this.size[1]; column++) {
                            if (this.cells[row][column] !== initialState.cells[row][column]) {
                                this.undoStack.nextDiff.pushCell([row, column], this.cells[row][column]);
                                this.cells[row][column] = initialState.cells[row][column];
                            }
                        }
                    }

                    this.undoStack.commit();
                    this.redoStack.clear();
                    this.win = false;
                }
            }
        }
    }

    private attemptMove(direction: Direction) {
        const nextCell = add(this.player.coords, directionVectors[direction]);
        const canMove: boolean = this.inMap(nextCell) && this.cells[nextCell[0]][nextCell[1]] === CellType.Normal;
        if (canMove) {
            registerMoveAnim(mainLevel, direction);

            if (!this.moved) {
                this.undoStack.nextDiff.moved = this.moved;
            }
            this.undoStack.nextDiff.setPlayerCoords(mainLevel.player.coords);
            this.undoStack.nextDiff.pushCell(nextCell, this.cells[nextCell[0]][nextCell[1]]);
            this.undoStack.commit();
            this.redoStack.clear();

            this.moved = true;
            this.player.coords = nextCell;
            this.cells[nextCell[0]][nextCell[1]] = CellType.Used;

            this.updateWin();
        }
        else {
            registerStuckAnim(mainLevel, direction);
        }
    }

    /**
     * update win state
     */
    private updateWin() {
        this.win = true;
        for (let i = 0; i < this.size[0] && this.win; i++) {
            for (let j = 0; j < this.size[1] && this.win; j++) {
                switch (this.cells[i][j]) {
                    case CellType.Empty:
                    case CellType.Used:
                    case CellType.Wall:
                        break;

                    case CellType.Normal:
                    default:
                        this.win = false;
                        break;
                }
            }
        }
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

        if (diff.getPlayerCoords() !== undefined) {
            this.player.coords = diff.getPlayerCoords() as readonly number[];
        }

        for (const [coords, cellType] of diff.cells) {
            this.cells[coords[0]][coords[1]] = cellType;
        }
    }

    reverseDiff(diff: StateDiff): StateDiff {
        const reverseDiff = new StateDiff();

        if (diff.moved !== undefined) {
            reverseDiff.moved = this.moved;
        }

        if (diff.getPlayerCoords() !== undefined) {
            reverseDiff.setPlayerCoords(this.player.coords);
        }

        for (const [coords, _] of diff.cells) {
            reverseDiff.pushCell(coords, this.cells[coords[0]][coords[1]]);
        }

        return reverseDiff;
    }
}

function isDirection(x: any): x is Direction {
    return typeof x === "number" && x in Direction;
}

class StateDiff {
    moved?: boolean;
    #playerCoords?: Readonly<number[]>;
    /** key is [row, column] */
    cells: Map<Readonly<number[]>, CellType>;
    constructor() {
        this.cells = new Map();
    }

    setPlayerCoords(position: Readonly<number[]>) {
        if (this.#playerCoords === undefined) {
            this.#playerCoords = Array.from(position);
        }
    }
    getPlayerCoords() {
        return this.#playerCoords;
    }

    pushCell(coords: Readonly<number[]>, cellType: CellType) {
        if (!this.cells.has(coords)) {
            this.cells.set(coords, cellType);
        }
    }
}

class StateStack {
    parent: Level;
    stateDiffs: StateDiff[];
    nextDiff: StateDiff;
    constructor(level: Level) {
        this.parent = level;
        this.stateDiffs = [];
        this.nextDiff = new StateDiff();
    }

    /**
     * Push all changes registered on nextDiff to the stack.
     * Rejected if nextDiff is empty.
     */
    commit() {
        if ([this.nextDiff.moved, this.nextDiff.getPlayerCoords()].some(x => x !== undefined) || this.nextDiff.cells.size > 0) {
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

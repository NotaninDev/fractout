import { Coordinates } from "./internal";

export class LevelTemplate {
    hearts: Readonly<Coordinates[]>;
    constructor(hearts: Readonly<Readonly<number[]>[]>) {
        this.hearts = hearts.map(heart => new Coordinates(heart));
    }
}


export const debugLevel = new LevelTemplate(
    [[0], [1, 1], [3, 2, 1]]
);

export const mainLevels: LevelTemplate[] = [
    new LevelTemplate(
        [[1], [3, 0, 3], [3, 2, 2], [2, 0], [2, 3, 0], [2, 2, 1, 0], [2, 2, 1, 3], [2, 3, 1], [2, 3, 2], [2, 3, 0], [2, 2, 1, 2, 1], [2, 2, 1, 2, 2]]),
];

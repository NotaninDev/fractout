import { Coordinates } from "./internal";

export class LevelTemplate {
    targets: Readonly<Coordinates[]>;
    constructor(targets: Readonly<Readonly<number[]>[]>) {
        this.targets = targets.map(target => new Coordinates(target));
    }
}


export const debugLevel = new LevelTemplate(
    [[0], [1, 1], [3, 2, 1]]
);

export const mainLevels: LevelTemplate[] = [
    new LevelTemplate(
        [[1], [2, 0]]),
];

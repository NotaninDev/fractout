import { CellType, PlayerTemplate } from "./internal";

export class LevelTemplate {
    title: string;
    size: number[]; // row, column
    cells: CellType[][];
    player: PlayerTemplate;
    constructor(title: string, levelText: string[]) {
        this.title = title;
        this.cells = LevelTemplate.decodeCells(levelText);
        this.size = [this.cells.length, this.cells[0].length];
        this.player = LevelTemplate.getPlayer(this.cells);
    }

    /**
     * load level from puzzlescript-style level text
     * 
     * run level validation at the same time
     * 
     * @param levelText array of string, each of which represents a row of cells
     * @returns 
     */
    static decodeCells(levelText: string[]): CellType[][] {
        if (levelText.length == 0)
            throw Error("level_text is empty");
        const columnCount = levelText[0].length;
        if (levelText.some(row => row.length !== columnCount))
            throw Error("row size is not uniform");

        let foundPlayer = false;
        const cells: CellType[][] = [];
        for (const rowText of levelText) {
            const rowData: CellType[] = [];
            for (const cell of rowText) {
                switch (cell.toLowerCase()) {
                    case '_':
                        rowData.push(CellType.Empty);
                        break;
                    case '.':
                        rowData.push(CellType.Normal);
                        break;
                    case '#':
                        rowData.push(CellType.Wall);
                        break;
                    case 'p':
                        if (foundPlayer) {
                            throw Error("player is defined more than once");
                        }
                        foundPlayer = true;
                        rowData.push(CellType.Used);
                        break;

                    default:
                        console.warn(`unsupported cell type '${cell}'`);
                        rowData.push(CellType.Empty);
                        break;
                }
            }
            cells.push(rowData);
        }
        if (!foundPlayer) {
            throw Error("player is not defined");
        }
        return cells;
    }

    /**
     * get PlayerTemplate from cells
     * 
     * there needs to be exactly one used cell
     */
    static getPlayer(cells: CellType[][]) {
        for (let i = 0; i < cells.length; i++) {
            for (let j = 0; j < cells[i].length; j++) {
                if (cells[i][j] == CellType.Used) {
                    return new PlayerTemplate([i, j]);
                }
                
            }
        }
        throw Error("player cell not found");
    }
}


export const debugLevel = new LevelTemplate(
    "debug",
    [
        "########_",
        "#......##",
        "#.p###..#",
        "#..#_##.#",
        "##.###..#",
        "_#.....##",
        "_#######_",
    ]);

export const mainLevels: LevelTemplate[] = [
    new LevelTemplate(
        "draw a line",
        [
            "###_###",
            "#.###p#",
            "#...#.#",
            "###...#",
            "__#####",
        ]),
    new LevelTemplate(
        "3 way (WIP)",
        [
            "__#######",
            "###.....#",
            "#...###.#",
            "#.p.....#",
            "#...###.#",
            "###.....#",
            "__#######",
        ]),
];

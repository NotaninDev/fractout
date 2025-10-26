import { inputHandler, timestepGlobal } from "./internal";

export const LEVEL_TRANSITION_MILLISECONDS = 160;
export class LevelTransitionConfig {
    active: boolean;
    startTime?: number;

    constructor() {
        this.active = false;
    }

    setMeta(startTime: number) {
        if (this.active) {
            console.warn('meta is already set');
            return;
        }
        this.active = true;
        this.startTime = startTime;
        inputHandler.blockInput();
    }

    update() {
        if (!this.active) return;

        if (timestepGlobal >= this.startTime! + LEVEL_TRANSITION_MILLISECONDS) {
            this.active = false;
            this.startTime = undefined;
            inputHandler.unblockInput();
        }
    }
}

export let metaLevel = new LevelTransitionConfig();

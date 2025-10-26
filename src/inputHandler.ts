import { Direction, editorMode, setEditorMode } from "./internal";

export class InputHandler {
    blocked: boolean;
    currentKey: InputHandler.KeyName;
    keyDownEventUnused: boolean;
    keyUpEventUnused: boolean;
    private keyDown: Record<InputHandler.KeyName, boolean>;
    constructor() {
        this.blocked = false;
        this.currentKey = InputHandler.KeyName.None;
        this.keyDownEventUnused = false;
        this.keyUpEventUnused = false;
        this.keyDown = {
            [InputHandler.KeyName.None]: false,
            [InputHandler.KeyName.Up]: false,
            [InputHandler.KeyName.Right]: false,
            [InputHandler.KeyName.Down]: false,
            [InputHandler.KeyName.Left]: false,
            [InputHandler.KeyName.Restart]: false,
            [InputHandler.KeyName.Undo]: false,
            [InputHandler.KeyName.Redo]: false,
            [InputHandler.KeyName.Editor]: false,
        }
    }

    unblockInput() {
        this.blocked = false;
    }
    blockInput() {
        this.blocked = true;
    }


    keyDownListener(event: KeyboardEvent) {
        event.preventDefault();

        const keyName = this.keycodeToName(event.code);
        if (keyName !== InputHandler.KeyName.None) {
            if (!this.keyDown[keyName]) {
                this.keyDown[keyName] = true;
            }
            else return false;
        }
        if (this.blocked || this.currentKey !== InputHandler.KeyName.None || this.keyUpEventUnused) {
            return false;
        }

        switch (keyName) {
            case InputHandler.KeyName.Up:
                break;
            case InputHandler.KeyName.Right:
                break;
            case InputHandler.KeyName.Down:
                break;
            case InputHandler.KeyName.Left:
                break;
            case InputHandler.KeyName.Undo:
            case InputHandler.KeyName.Redo:
                break;
            case InputHandler.KeyName.Restart:
                break;
            case InputHandler.KeyName.Editor:
                setEditorMode(!editorMode);
                return false;

            default:
                return false;
        }
        this.currentKey = keyName;
        this.keyDownEventUnused = true;
        return false;
    }

    keyUpListener(event: KeyboardEvent) {
        const keyName = this.keycodeToName(event.code);
        if (keyName !== InputHandler.KeyName.None) {
            this.keyDown[keyName] = false;
        }

        if (keyName !== this.currentKey) return;

        switch (keyName) {
            case InputHandler.KeyName.Up:
                break;
            case InputHandler.KeyName.Right:
                break;
            case InputHandler.KeyName.Down:
                break;
            case InputHandler.KeyName.Left:
                break;
            case InputHandler.KeyName.Undo:
            case InputHandler.KeyName.Redo:
                break;
            case InputHandler.KeyName.Restart:
                break;

            default:
                return;
        }
        this.currentKey = InputHandler.KeyName.None;
        if (this.keyDownEventUnused) {
            this.keyDownEventUnused = false;
        }
    }

    private keycodeToName(keycode: string): InputHandler.KeyName {
        switch (keycode) {
            case "ArrowUp":
                return InputHandler.KeyName.Up;
            case "ArrowRight":
                return InputHandler.KeyName.Right;
            case "ArrowDown":
                return InputHandler.KeyName.Down;
            case "ArrowLeft":
                return InputHandler.KeyName.Left;
            case "KeyR":
                return InputHandler.KeyName.Restart;
            case "KeyZ":
                return InputHandler.KeyName.Undo;
            case "KeyX":
                return InputHandler.KeyName.Redo;
            // case "Digit8":
            //     return InputHandler.KeyName.Editor;
            default:
                return InputHandler.KeyName.None;
        }
    }

    getCurrentDirection(): Direction | undefined {
        switch (this.currentKey) {
            case InputHandler.KeyName.Up:
                return Direction.Up;
            case InputHandler.KeyName.Right:
                return Direction.Right;
            case InputHandler.KeyName.Down:
                return Direction.Down;
            case InputHandler.KeyName.Left:
                return Direction.Left;
            default:
                return undefined;
        }
    }
}
export namespace InputHandler {
    export enum KeyName {
        None = -100,
        Up,
        Right,
        Down,
        Left,
        Restart,
        Undo,
        Redo,
        Editor,
    }
}

export const inputHandler = new InputHandler();

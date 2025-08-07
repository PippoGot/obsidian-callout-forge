import { escapeHTML } from "../utils/html";

export class CodeblockProperty {
    constructor(public readonly key: string, private source: string) { }

    get value() { return this.source }

    // Append a line of text to the source field
    extend(value: string): void {
        this.source += `\n${value}`
    }

    // Wrap the source with a special div to render later
    wrap(): string {
        return `<div class="cf-markdown">${escapeHTML(this.value)}</div>`;
    }

    // Return a string representation of the value
    toString(): string { return `${this.key}:\n${this.source}` }
}
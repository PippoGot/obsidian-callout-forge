import { escapeHTML } from "../utils/html";

export class Pair {
    constructor(public readonly key: string, private sourceValue: string) { }

    get value() { return this.sourceValue }

    // Append a line of text to the value field, if the Pair is not already rendered
    extend(value: string): void {
        this.sourceValue += `\n${value}`
    }

    // Wrap the markdown text with a special div to render later
    wrap(): string {
        return `<div class="cf-markdown">${escapeHTML(this.value)}</div>`;
    }

    // Return a string representation of the value
    toString(): string { return `${this.key}:\n${this.sourceValue}` }
}
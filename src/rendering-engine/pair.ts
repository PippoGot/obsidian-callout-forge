
import { CalloutForgeError } from "../utils/errors";
import { renderMarkdownString } from "./renderer";
import { ObsidianRenderingContext } from "./types";

export class Pair {
    private isRendered: boolean = false;
    private renderedValue: string;
    constructor(public readonly key: string, private sourceValue: string, private context: ObsidianRenderingContext) { }

    get value() { return this.sourceValue }

    // Append a line of text to the value field, if the Pair is not already rendered
    extend(value: string): void {
        if (this.isRendered) {
            throw new CalloutForgeError("Trying to change value to a rendered Pair object.")
        }

        this.sourceValue += `\n${value}`
    }

    // Render a Markdown string value to a HTML string
    async render(): Promise<string> {
        // If not rendered, use the obsidian API to render
        if (!this.isRendered) {
            this.renderedValue = await renderMarkdownString(this.sourceValue, this.context);
            this.isRendered = true;
        }

        // then return the rendered value
        return this.renderedValue;
    }

    // Return a string representation of the value
    toString(): string { return `${this.key}:\n${this.sourceValue}` }
}

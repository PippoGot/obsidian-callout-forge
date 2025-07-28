import { App, Plugin } from 'obsidian';

export class MarkdownRenderedProperty {
    constructor(public readonly name: string, public readonly value: string) { }

    // Method to print the object
    public toString(): string {
        return `${this.name}:\n${this.value}`;
    }
}

export interface RenderingContext {
    app: App;
    plugin: Plugin;
    sourcePath: string;
}
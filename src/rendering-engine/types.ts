import { App, Plugin } from 'obsidian';

export interface ObsidianRenderingContext {
    app: App;
    plugin: Plugin;
    sourcePath: string;
}
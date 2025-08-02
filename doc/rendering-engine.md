# Rendering Engine Module

This document explains the internal structure and workflow of the **Rendering Engine** in the **CalloutForge** Obsidian plugin. It focuses on the `renderMarkdownString` function and the `Pair` class, which work together to render markdown text into HTML using Obsidian's native rendering API.

---
## Overview

The **Rendering Engine** converts raw markdown strings into HTML strings by leveraging Obsidian's built-in `MarkdownRenderer`.

It is responsible for:

- Rendering markdown **values of individual pairs** asynchronously.
- Caching rendered results to avoid repeated rendering.
- Handling context information required by Obsidian for rendering (e.g., app instance, plugin, source path).

---
## File Structure

The module consists of three main files:

|File|Purpose|
|---|---|
|`renderer.ts`|Exposes `renderMarkdownString` — converts markdown source to HTML.|
|`pair.ts`|Defines the `Pair` class that stores raw and rendered markdown.|
|`types.ts`|Defines `ObsidianRenderingContext` interface for rendering context.|

---
## Rendering Workflow

### 1. `renderMarkdownString` (`renderer.ts`)

- **Input**: Raw markdown string and an `ObsidianRenderingContext`.
- **Output**: Promise resolving to an HTML string.

#### Key Responsibilities:

- Creates a **temporary hidden DOM element** (`div`) to render into.
- Uses Obsidian's `MarkdownRenderer.render()` method to convert markdown into HTML inside this element.
- Serializes the rendered DOM element to an HTML string using `XMLSerializer`.
- Returns the serialized HTML string.

#### Important Notes:

- The function is **async** because Obsidian's rendering API is asynchronous.
- The `context` provides necessary access to the Obsidian `app`, `plugin`, and source path.
- Does not mutate any DOM visible to the user; operates fully in-memory.

### 2. `Pair` Class (`pair.ts`)

The `Pair` class represents a key-value pair where the value is markdown text that can be rendered into HTML.

#### Properties:

|Property|Description|
|---|---|
|`key`|The unique key identifier for the pair.|
|`sourceValue`|Raw markdown text content.|
|`isRendered`|Flag indicating if the markdown has been rendered.|
|`renderedValue`|Cached HTML string after rendering.|
|`context`|`ObsidianRenderingContext` for rendering.|

#### Key Methods:

|Method|Purpose|
|---|---|
|`extend()`|Append a new line of text to `sourceValue` if not yet rendered.|
|`render()`|Render the markdown into HTML using `renderMarkdownString` and cache the result. Returns a Promise resolving to the HTML string.|
|`toString()`|Returns a string representation for debugging (`key` and raw value).|

#### Workflow:

- On creation, `Pair` holds raw markdown text.
- Calling `extend()` adds more content lines, **only if not rendered yet**.
- Calling `render()` triggers async markdown rendering **once**, caches the HTML, and returns it.
- Subsequent `render()` calls return cached HTML immediately.

### 3. `ObsidianRenderingContext` (`types.ts`)

Defines the rendering context needed for `MarkdownRenderer`:

|Property|Type|Description|
|---|---|---|
|`app`|`App`|Obsidian app instance.|
|`plugin`|`Plugin`|The CalloutForge plugin instance.|
|`sourcePath`|`string`|File path of the markdown source for context.|

---
## Example Rendering Flow

```ts
const pair = new Pair("description", "This **is** markdown.", context);

// Append additional lines
pair.extend("New line here.");

// Render markdown to HTML asynchronously
const html = await pair.render();

console.log(html); // Outputs the rendered HTML string for the markdown content
```

---
## Summary

- **Core Idea**: Wrap Obsidian’s markdown rendering in an async function that converts markdown to HTML.
- **Caching**: `Pair` caches rendered HTML to avoid redundant renders.
- **Context-Aware**: Uses Obsidian’s app and plugin context for accurate rendering.
- **Simple API**: Exposes a clear interface for extending or integrating into larger parsing/rendering pipelines.
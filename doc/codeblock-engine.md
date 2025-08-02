# Codeblock Engine Module

This document explains the internal structure and workflow of the **Codeblock Engine** in the **CalloutForge** Obsidian plugin, focusing on the `CodeblockParser` and its supporting components. It also describes how you can extend it to support new parsing rules or features.

---
## Overview

The **Codeblock Engine** is responsible for interpreting and processing **custom codeblocks** inside the Obsidian editor.
It parses text in a line-by-line manner, identifies structural elements (pairs, nested blocks, plain text), and converts them into a list of `Pair` objects for further rendering.

The parser works like a **finite state machine** (FSM):

1. Each line is **matched** against a set of regex-based rules (`MATCHERS`).
2. A **state** object (`ParserState`) determines how the current line should be handled.
3. The state decides what the **next state** should be, based on the detected `JumpCondition`.
4. The loop continues until the parser reaches a **final state** or throws a parsing error.

---
## File Structure

The module consists of three main files:

| File        | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `parser.ts` | The main parser class that coordinates parsing and state transitions.     |
| `states.ts` | All possible parser states, defining behavior when a line is encountered. |
| `match.ts`  | Regex rules and matching logic for identifying line types.                |

---
## Parsing Workflow

### 1. `CodeblockParser` (`parser.ts`)

- **Input**: The raw codeblock text and an `ObsidianRenderingContext`.
- **Output**: A list of parsed `Pair` objects (`Pair[]`).

#### Key Responsibilities:

- **Initialization**: Validates input, trims whitespaces, splits into lines.
- **Matching**: Uses `MATCHERS` to identify the type of the current line.
- **State Management**: Starts with `CodeblockStartState` and transitions until a final state.
- **Pair Storage**: Builds `Pair` objects when encountering `Pair`-type lines.
- **Error Handling**: Throws `CalloutForgeError` for invalid syntax or unexpected states.
- **Validation**: Ensures no duplicate keys exist in the final pair list.

#### Important Methods:

|Method|Purpose|
|---|---|
|`fromString()`|Static helper to parse a string directly into `Pair[]`.|
|`setState()`|Updates the parser's current state.|
|`newPair()`|Starts a new `Pair` and stores the previous one.|
|`storePair()`|Finalizes and saves the current `Pair`.|
|`extendPairValue()`|Appends content to the current `Pair`.|
|`setCodefenceRegex()` / `clearCodefenceRegex()`|Handles detection of nested code blocks.|
|`matchCurrentLine()`|Finds the first regex that matches the current line.|

---
### 2. `ParserState` and Subclasses (`states.ts`)

All parsing logic is implemented as **state classes**, each inheriting from `ParserState`.

#### Common State Types:

- **Initial**: First state in the machine (`CodeblockStartState`).
- **Accepting**: Can transition to the final state (`PairState`, `PairContentState`, etc.).
- **Final**: Ends parsing (`CodeblockEndState`, `ParsingErrorState`).
- **Normal**: Default state type if not one of the above.

#### Core Method:

- `handle()` — Executes state-specific logic and moves to the next state.

#### State Flow Examples:

1. **CodeblockStartState** → expects a `Pair` → moves to `PairState`.
2. **PairState** → stores current pair and reads a new one.
3. **PairContentState** → appends content lines to the current pair.
4. **NestedStartState** → detects triple-backticks and switches into nested mode.
5. **NestedContentState** → appends lines until matching closing backticks.
6. **NestedEndState** → exits nested mode.
7. **CodeblockEndState** → finalizes parsing.

#### Error Handling:

- `ParsingErrorState` throws an exception with a descriptive message.

---
### 3. Matching Rules (`match.ts`)

The `MATCHERS` map defines regex rules for detecting line types:

| JumpCondition | Description           | Regex                                      |
| ------------- | --------------------- | ------------------------------------------ |
| `Pair`        | Key-value pair        | `/^([a-z\-]+)\s*:\s*(.*)$/`                |
| `NestedStart` | Start of a code fence | `/^(`{3,})(?:\s*[^\s]+)?\s*$/`             |
| `NestedEnd`   | End of a code fence   | Dynamically set based on opening backticks |
| `Text`        | Any other line        | `/^.*$/`                                   |

---
## Example Parsing Flow

Given this codeblock:
`````markdown
````calloutforge
title: Example
description: This is a test
```js console.log("Hello");
```
notes: Some extra info
````
`````

The parser will:
1. Match `title: Example` → `PairState` → create pair `{ key: "title", value: "Example" }`.
2. Match `description: This is a test` → store previous pair, create new.
3. Match triple backticks → `NestedStartState` → enable nested parsing.
4. Append `console.log("Hello");` in `NestedContentState`.
5. Match closing triple backticks → `NestedEndState`.
6. Match `notes: Some extra info` → `PairState`.
7. End parsing in `CodeblockEndState`.

---

## Extending the Parser

You can add **new syntax** or **custom behavior** by:

### 1. Adding a New `JumpCondition`
Add a new value to the `JumpCondition` enum in `match.ts`.

```ts
export enum JumpCondition {
    Pair,
    NestedStart,
    NestedEnd,
    Text,
    MyCustomCondition, // New
}
```

Create a corresponding `LineMatchRule` and add it to `MATCHERS`.

```ts
[JumpCondition.Custom, new LineMatchRule(JumpCondition.Custom, /^custom-regex$/)]
```

> [!note]
> **Matcher Order Matters**
> The `MATCHERS` map is evaluated sequentially, and the **first matching rule** determines how the finite state machine (FSM) advances.
> When adding a custom state and `JumpCondition`, ensure that:
>
> - Its regex pattern is **unique** and does not unintentionally overlap with existing matchers.
> - It appears **before** the generic “any-text” matcher (`JumpCondition.Text`) in `MATCHERS`, otherwise it will never be reached.
>
> This ordering is critical for your new state to be recognized and processed correctly.

### 2. Creating a New State

- Extend `ParserState` in `states.ts`.
- Implement `handle()` to process your custom line.
- Define a `jumpMap` for valid transitions from this state.

```ts
export class CustomState extends ParserState {
    public handle(): void {
        const match = this.parent.getMatch();
        console.log("Custom line:", match.lineContent);
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.Pair]: PairState,
        [JumpCondition.Text]: CustomState
    };
}
```

### 3. Updating Existing `jumpMap`s

If other states should transition into your new state, update their `jumpMap`.

```ts
protected override jumpMap: JumpMap = {
    [JumpCondition.Pair]: PairState,
    [JumpCondition.MyCustomCondition]: MyCustomState,
    [JumpCondition.Text]: PairContentState,
};
```

### 4. Testing the New Functionality

Test input that:
- Matches your new pattern.
- Appears before/after other known matchers.
- Handles edge cases like empty lines or unexpected EOF.

---
## Error Handling Notes

- All syntax errors or invalid transitions result in `ParsingErrorState`.
- You can provide more descriptive errors by:
    - Setting `this.parent.errorMsg` before transitioning to `ParsingErrorState`.
    - Including line number info via `this.parent.getMatch().lineIndex`.

---
## Summary

- **Core Idea**: This parser is a finite state machine mapping regex matches to states.
- **Extensible**: Add new matchers, new states, and update jump maps.
- **Safe**: Built-in validation for duplicates and structured error handling.
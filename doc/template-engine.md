# Template Engine Module

This document explains the internal structure and workflow of the **Template Engine** in the **CalloutForge** Obsidian plugin, focusing on the `TemplateParser` and its supporting components. It also describes how you can extend it to support new template syntax or behaviors.

---
## Overview

The **Template Engine** is responsible for interpreting and processing **template strings** containing _handlebar-style placeholders_.

These templates can contain:

- **Required variables** – must be provided.
- **Optional variables** – can be missing, replaced with an empty string.
- **Fallback variables** – replaced with a default value if missing.

The parser works like a **tokenizer**:

1. Merges all handlebar syntax regexes into a **master regex** with named capture groups.
2. Scans the template string, identifying **tokens** (plain text or placeholders).
3. Creates a `Template` object composed of `Token` instances.
4. The `Template` can later be **compiled** with `Pair[]` data, replacing placeholders with custom values.

---
## File Structure

The module consists of four main files:

| File           | Purpose                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `parser.ts`    | The main parser class that converts a string into a `Template` object. |
| `handlebar.ts` | Syntax definitions for placeholders.                                   |
| `token.ts`     | Token classes representing both text and placeholder segments.         |
| `template.ts`  | Holds the parsed tokens and compiles them into a final string.         |

---
## Parsing Workflow

### 1. `TemplateParser` (`parser.ts`)

- **Input**: A raw template string.
- **Output**: A `Template` object containing an ordered list of tokens.

#### Key Responsibilities:

- **Initialization**: Loads the syntax rules from `SYNTAX_LIBRARY`.
- **Regex Building**: Combines all syntax patterns into one _master regex_ for scanning.
- **Tokenization**: Iterates through all matches, creating:
    - `TextToken` for literal text segments.
    - Appropriate `HandlebarToken` subtype for placeholders.
- **Error Handling**: Throws `CalloutForgeError` if no syntax matches or a syntax fails to parse its own substring.
- **Finalization**: Appends any trailing text after the last match.
#### Important Methods:

| Method                 | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `fromString()`         | Static helper to parse a string into a `Template`.                   |
| `parse()`              | Tokenizes the input string into `Token[]`.                           |
| `buildMasterRegex()`   | Merges all handlebar syntax regexes into a single named-group regex. |
| `addTextBeforeMatch()` | Captures plain text before a placeholder match.                      |
| `identifySyntax()`     | Determines which syntax matched from the named groups.               |
| `tokenFromMatch()`     | Creates the appropriate `HandlebarToken` from a regex match.         |
| `addRemainingText()`   | Adds final trailing text as a `TextToken`.                           |

---
### 2. Handlebar Syntax (`handlebar.ts`)

Each placeholder type is defined by a **syntax rule** implementing `HandlebarSyntax`:

| Syntax Name | Pattern Example  | Behavior                                             |
| ----------- | ---------------- | ---------------------------------------------------- |
| `required`  | `{{ title }}`    | Must be present in `Pair[]`, otherwise throws error. |
| `optional`  | `{{ title ? }}`  | Uses empty string if not provided.                   |
| `fallback`  | `{{ title `\|` Untitled }}`  |                                            |

#### Structure of `HandlebarSyntax`:

- `syntaxName`: Unique name for the syntax.
- `regex`: Regex to detect and capture key/fallback parts.
- `toToken()`: Function that converts the regex match into a `HandlebarToken`.

---
### 3. Tokens (`token.ts`)

The parser output consists of `Token` objects:

#### Token Types:

- **TextToken** – literal string content.
- **HandlebarToken** – base type for all placeholders.

#### HandlebarToken Subclasses:

|Class|Behavior|
|---|---|
|`RequiredToken`|No fallback, throws error if missing.|
|`OptionalToken`|Empty string if missing.|
|`FallbackToken`|Uses provided fallback string if missing.|

#### Normalization:

- `normalize(pair?: Pair)` – Converts a `HandlebarToken` into a `TextToken` by:
    - Rendering the matching `Pair` if found.
    - Falling back to default value if available.
    - Throwing an error if required and missing.

---
### 4. Template Object (`template.ts`)

A `Template` holds the ordered list of parsed tokens.

#### Core Method:

```ts
async compile(pairs: Pair[]): Promise<string>
```

- Builds a quick lookup (`Map<string, Pair>`) for efficiency.
- Iterates through all tokens, normalizing placeholders with provided pairs.
- Joins all resulting `TextToken` contents into the final compiled string.

---
## Example Parsing Flow

Given this template string:

```markdown
Hello {{ name }},
Your order {{ orderId ? }} will ship {{ date | soon }}.
```

The parsing process produces:

1. `TextToken("Hello ")`
2. `RequiredToken("name")`
3. `TextToken(", Your order ")`
4. `OptionalToken("orderId")`
5. `TextToken(" will ship ")`
6. `FallbackToken("date", "soon")`
7. `TextToken(".")`

When compiled with:

```ts
pairs = [
  new Pair("name", "Alice"),
  new Pair("orderId", "1234")
]
```

The result is:

```markdown
Hello Alice,
Your order 1234 will ship soon.
```

---
## Extending the Parser

You can add **new placeholder types** by:

### 1. Adding a New Syntax Rule

- Add a new entry to `SYNTAX_LIBRARY`:

```ts
["uppercase", {
  syntaxName: "uppercase",
  regex: /\{\{\^\s*([a-zA-Z\-]+)\s*\}\}/,
  toToken(match) {
    return new UppercaseToken(match[1].trim());
  }
}]
```

2. Creating a New Token Subclass

```ts
export class UppercaseToken extends HandlebarToken {
  async normalize(pair?: Pair) {
    if (pair) return new TextToken((await pair.render()).toUpperCase());
    throw new CalloutForgeError(`Missing value for key "${this.key}"`);
  }
}
```

### 3. Parser Updates

No parser changes are needed — the `TemplateParser` automatically detects new syntax from `SYNTAX_LIBRARY`.

---
## Error Handling Notes

- If a required placeholder is missing in the provided `Pair[]`, a `CalloutForgeError` is thrown.
- If a regex in `SYNTAX_LIBRARY` fails to match its own substring, parsing is aborted with an error.
- All errors contain descriptive messages to help debug template issues.

---
## Summary

- **Core Idea**: The Template Engine is a regex-driven tokenizer that converts template strings into `Token` objects.
- **Extensible**: Adding new syntaxes requires only a new `HandlebarSyntax` entry a new `HandlebarToken` subclass.
- **Safe**: Built-in error handling ensures invalid templates fail early.
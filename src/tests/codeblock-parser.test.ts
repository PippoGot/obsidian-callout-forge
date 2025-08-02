import { CodeblockParser } from '../codeblock-engine/parser';

const MOCKS = {
    singleLineProperty: `template: default
title: Hello World`,

    multilineProperty: `template: default
description: First line
Second line
Third line`,

    pairWithCodefence: `template: default
example: some code
\`\`\`
const x = 42;
console.log(x);
\`\`\``,

    multiplePropertiesAndFences: `
template: default
title: Example
description: starts here
continues here
\`\`\`
code block line
another line
\`\`\`
footer: done
`.trim(),

    codefenceNotClosed: `template: default
code: intro
\`\`\`
function()`,

    codefence4Backticks: `
template: default
snippet: usage
\`\`\`\`
line 1
line 2
\`\`\`\`
`.trim(),

    pairWithColonInValue: `template: default
note: This is a note: with a colon`,

    codefenceWithLang: `template: default
example: with lang
\`\`\`js
console.log("Hello");
\`\`\``,

    pairHyphenatedName: `template: default
custom-key: some value`,

    trailingEmptyLines: `template: default
key: value


`,

    multipleCodeBlocksDifferentProps: `
template: default
alpha: start
\`\`\`
code A
\`\`\`
beta: next
\`\`\`
code B
\`\`\`
`.trim(),

    whitespaceOnlyValue: `template: default
blank:    `,

    duplicateSingle: `
template: default
title: Hello
description: This is the first description.
description: This is a duplicate.
\`\`\`
code block here
\`\`\`
  `,

    duplicateMultiple: `
template: default
notes: First
template: duplicate
notes: Second
\`\`\`
some code
\`\`\`
  `,

    uniqueProperties: `
template: Unique
description: All different
author: Someone
\`\`\`
code goes here
\`\`\`
  `,

    missingTemplate: `
title: Missing template pair
description: Some description
\`\`\`
code block
\`\`\`
  `,
};

describe("CodeblockParser", () => {

    // Verifies static fromString works
    it("parses using fromString static method", () => {
        const pairs = CodeblockParser.fromString(MOCKS.singleLineProperty);
        expect(pairs).toHaveLength(2);
        expect(pairs.find(p => p.key === "title")?.value).toBe("Hello World");
    });

    // Parses a basic single-line pair
    it("parses single-line pair", () => {
        const parser = new CodeblockParser(MOCKS.singleLineProperty);
        expect(parser.pairList).toHaveLength(2);
        expect(parser.pairList.find(p => p.key === "title")?.value).toBe("Hello World");
        expect(parser.pairList.find(p => p.key === "template")?.value).toBe("default");
    });

    // Parses multiline pair with plain text continuation
    it("parses multiline pair with plain text", () => {
        const parser = new CodeblockParser(MOCKS.multilineProperty);
        expect(parser.pairList).toHaveLength(2);
        expect(parser.pairList.find(p => p.key === "description")?.value)
            .toBe("First line\nSecond line\nThird line");
    });

    // Parses pair followed by fenced code block
    it("parses pair with codefence", () => {
        const parser = new CodeblockParser(MOCKS.pairWithCodefence);
        expect(parser.pairList.find(p => p.key === "example")?.value)
            .toBe("some code\n```\nconst x = 42;\nconsole.log(x);\n```");
    });

    // Parses multiple pairs including fenced blocks
    it("parses multiple pairs and fences", () => {
        const parser = new CodeblockParser(MOCKS.multiplePropertiesAndFences);
        const props = parser.pairList;
        expect(props).toHaveLength(4);
        expect(props.find(p => p.key === "title")?.value).toBe("Example");
        expect(props.find(p => p.key === "description")?.value)
            .toBe("starts here\ncontinues here\n```\ncode block line\nanother line\n```");
        expect(props.find(p => p.key === "footer")?.value).toBe("done");
        expect(props.find(p => p.key === "template")?.value).toBe("default");
    });

    // Throws if input is not a string
    it("throws error if input is not a string", () => {
        // @ts-expect-error
        expect(() => new CodeblockParser(123)).toThrow("Source must be a string to parse.");
    });

    // Throws if input is empty or whitespace only
    it("throws error on empty input", () => {
        expect(() => new CodeblockParser("   \n   \n")).toThrow("Codeblock is empty or has only whitespaces.");
    });

    // Throws if codeblock starts without pair
    it("throws error if codeblock starts without pair", () => {
        expect(() => new CodeblockParser("no-colon here")).toThrow(/Codeblock must start with a pair/i);
    });

    // Throws if codefence starts and never ends
    it("throws error if codefence is not closed", () => {
        expect(() => new CodeblockParser(MOCKS.codefenceNotClosed)).toThrow(/Unexpected end of input/i);
    });

    // Throws if text exists with no active pair
    it("throws error when pair text exists without current pair", () => {
        const parser = new CodeblockParser(MOCKS.singleLineProperty);
        // @ts-expect-error
        parser.pair = null;
        // @ts-expect-error
        parser.index = 0;
        // @ts-expect-error
        parser.lines = ["dummy line"];

        expect(() => {
            parser.extendPairValue("dummy text");
        }).toThrow(/no active pair to append to/i);
    });

    // Parses codefence with more than three backticks
    it("parses codefence with 4 backticks", () => {
        const parser = new CodeblockParser(MOCKS.codefence4Backticks);
        expect(parser.pairList.find(p => p.key === "snippet")?.value)
            .toBe("usage\n````\nline 1\nline 2\n````");
    });

    // Property with colon in value
    it("parses pair with colon in value", () => {
        const parser = new CodeblockParser(MOCKS.pairWithColonInValue);
        expect(parser.pairList.find(p => p.key === "note")?.value)
            .toBe("This is a note: with a colon");
    });

    // Codefence with language annotation is preserved as text
    it("parses codefence with language annotation as text", () => {
        const parser = new CodeblockParser(MOCKS.codefenceWithLang);
        expect(parser.pairList.find(p => p.key === "example")?.value)
            .toBe('with lang\n```js\nconsole.log("Hello");\n```');
    });

    // Parses pair with hyphenated name
    it("parses pair with hyphenated name", () => {
        const parser = new CodeblockParser(MOCKS.pairHyphenatedName);
        expect(parser.pairList.find(p => p.key === "custom-key")?.value)
            .toBe("some value");
    });

    // Parses pair and ignores trailing empty lines
    it("parses pair and ignores trailing empty lines", () => {
        const parser = new CodeblockParser(MOCKS.trailingEmptyLines);
        expect(parser.pairList.find(p => p.key === "key")?.value)
            .toBe("value");
    });

    // Parses multiple sequential code blocks in different pairs
    it("parses multiple code blocks in different pairs", () => {
        const parser = new CodeblockParser(MOCKS.multipleCodeBlocksDifferentProps);
        expect(parser.pairList.find(p => p.key === "alpha")?.value)
            .toBe("start\n```\ncode A\n```");
        expect(parser.pairList.find(p => p.key === "beta")?.value)
            .toBe("next\n```\ncode B\n```");
    });

    // Parses pair with whitespace-only value
    it("parses pair with whitespace-only value", () => {
        const parser = new CodeblockParser(MOCKS.whitespaceOnlyValue);
        expect(parser.pairList.find(p => p.key === "blank")?.value)
            .toBe("");
    });

    // Throws for a single duplicate pair
    it("throws an error for a single duplicate pair", () => {
        expect(() => new CodeblockParser(MOCKS.duplicateSingle))
            .toThrow(/Duplicate pairs found: description/);
    });

    // Throws listing multiple duplicate pairs
    it("throws an error listing multiple duplicate pairs", () => {
        expect(() => new CodeblockParser(MOCKS.duplicateMultiple))
            .toThrow(/Duplicate pairs found: template, notes/);
    });

    // Does not throw when all pairs are unique
    it("does not throw when all pairs are unique", () => {
        expect(() => new CodeblockParser(MOCKS.uniqueProperties))
            .not.toThrow();
    });
});

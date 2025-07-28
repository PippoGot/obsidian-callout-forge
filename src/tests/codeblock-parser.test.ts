import { CodeblockParser } from '../codeblock-parser/parser';

const MOCKS = {
    singleLineProperty: `template: default
title: Hello World`,

    multilineProperty: `template: default
description: First line
Second line
Third line`,

    propertyWithCodefence: `template: default
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

    propertyWithColonInValue: `template: default
note: This is a note: with a colon`,

    codefenceWithLang: `template: default
example: with lang
\`\`\`js
console.log("Hello");
\`\`\``,

    propertyHyphenatedName: `template: default
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
title: Missing template property
description: Some description
\`\`\`
code block
\`\`\`
  `,
};

describe("CodeblockParser", () => {

    // Parses a basic single-line property
    it("parses single-line property", () => {
        const parser = new CodeblockParser(MOCKS.singleLineProperty);
        expect(parser.properties).toHaveLength(2);
        expect(parser.properties.find(p => p.name === "title")?.value).toBe("Hello World");
        expect(parser.properties.find(p => p.name === "template")?.value).toBe("default");
    });

    // Parses multiline property with plain text continuation
    it("parses multiline property with plain text", () => {
        const parser = new CodeblockParser(MOCKS.multilineProperty);
        expect(parser.properties).toHaveLength(2);
        expect(parser.properties.find(p => p.name === "description")?.value)
            .toBe("First line\nSecond line\nThird line");
    });

    // Parses property followed by fenced code block
    it("parses property with codefence", () => {
        const parser = new CodeblockParser(MOCKS.propertyWithCodefence);
        expect(parser.properties.find(p => p.name === "example")?.value)
            .toBe("some code\n```\nconst x = 42;\nconsole.log(x);\n```");
    });

    // Parses multiple properties including fenced blocks
    it("parses multiple properties and fences", () => {
        const parser = new CodeblockParser(MOCKS.multiplePropertiesAndFences);
        const props = parser.properties;
        expect(props).toHaveLength(4);
        expect(props.find(p => p.name === "title")?.value).toBe("Example");
        expect(props.find(p => p.name === "description")?.value)
            .toBe("starts here\ncontinues here\n```\ncode block line\nanother line\n```");
        expect(props.find(p => p.name === "footer")?.value).toBe("done");
        expect(props.find(p => p.name === "template")?.value).toBe("default");
    });

    // Throws if input is not a string
    it("throws error if input is not a string", () => {
        // @ts-expect-error
        expect(() => new CodeblockParser(123)).toThrow("Codeblock source must be a string.");
    });

    // Throws if input is empty or whitespace only
    it("throws error on empty input", () => {
        expect(() => new CodeblockParser("   \n   \n")).toThrow("Codeblock is empty or has only whitespaces.");
    });

    // Throws if codeblock starts without property
    it("throws error if codeblock starts without property", () => {
        expect(() => new CodeblockParser("no-colon here")).toThrow(/Codeblock must start with a property/i);
    });

    // Throws if codefence starts and never ends
    it("throws error if codefence is not closed", () => {
        expect(() => new CodeblockParser(MOCKS.codefenceNotClosed)).toThrow(/Unexpected end of input/i);
    });

    // Throws if text exists with no active property
    it("throws error when property text exists without current property", () => {
        const parser = new CodeblockParser(MOCKS.singleLineProperty);
        // @ts-expect-error
        parser._currentProperty = null;
        // @ts-expect-error
        parser._currentIndex = 0;
        // @ts-expect-error
        parser._lines = ["dummy line"];

        expect(() => {
            // @ts-expect-error
            parser._updateProperty();
        }).toThrow(/no current property to update/i);
    });

    // Parses codefence with more than three backticks
    it("parses codefence with 4 backticks", () => {
        const parser = new CodeblockParser(MOCKS.codefence4Backticks);
        expect(parser.properties.find(p => p.name === "snippet")?.value)
            .toBe("usage\n````\nline 1\nline 2\n````");
    });

    // Property with colon in value
    it("parses property with colon in value", () => {
        const parser = new CodeblockParser(MOCKS.propertyWithColonInValue);
        expect(parser.properties.find(p => p.name === "note")?.value)
            .toBe("This is a note: with a colon");
    });

    // Codefence with language annotation is preserved as text
    it("parses codefence with language annotation as text", () => {
        const parser = new CodeblockParser(MOCKS.codefenceWithLang);
        expect(parser.properties.find(p => p.name === "example")?.value)
            .toBe('with lang\n```js\nconsole.log("Hello");\n```');
    });

    // Parses property with hyphenated name
    it("parses property with hyphenated name", () => {
        const parser = new CodeblockParser(MOCKS.propertyHyphenatedName);
        expect(parser.properties.find(p => p.name === "custom-key")?.value)
            .toBe("some value");
    });

    // Parses property and ignores trailing empty lines
    it("parses property and ignores trailing empty lines", () => {
        const parser = new CodeblockParser(MOCKS.trailingEmptyLines);
        expect(parser.properties.find(p => p.name === "key")?.value)
            .toBe("value");
    });

    // Parses multiple sequential code blocks in different properties
    it("parses multiple code blocks in different properties", () => {
        const parser = new CodeblockParser(MOCKS.multipleCodeBlocksDifferentProps);
        expect(parser.properties.find(p => p.name === "alpha")?.value)
            .toBe("start\n```\ncode A\n```");
        expect(parser.properties.find(p => p.name === "beta")?.value)
            .toBe("next\n```\ncode B\n```");
    });

    // Parses property with whitespace-only value
    it("parses property with whitespace-only value", () => {
        const parser = new CodeblockParser(MOCKS.whitespaceOnlyValue);
        expect(parser.properties.find(p => p.name === "blank")?.value)
            .toBe("");
    });

    // Throws for a single duplicate property
    it("throws an error for a single duplicate property", () => {
        expect(() => new CodeblockParser(MOCKS.duplicateSingle))
            .toThrow(/Duplicate properties found: description/);
    });

    // Throws listing multiple duplicate properties
    it("throws an error listing multiple duplicate properties", () => {
        expect(() => new CodeblockParser(MOCKS.duplicateMultiple))
            .toThrow(/Duplicate properties found: template, notes/);
    });

    // Does not throw when all properties are unique
    it("does not throw when all properties are unique", () => {
        expect(() => new CodeblockParser(MOCKS.uniqueProperties))
            .not.toThrow();
    });

    // Throws if mandatory property 'template' is missing
    it("throws error if mandatory property 'template' is missing", () => {
        expect(() => new CodeblockParser(MOCKS.missingTemplate))
            .toThrow(/Missing mandatory properties: template/);
    });

});

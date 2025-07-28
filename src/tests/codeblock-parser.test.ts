import { CodeblockParser } from '../codeblock-parser/parser';

describe("CodeblockParser", () => {

    /** Parses a basic single-line property */
    it("parses single-line property", () => {
        const input = `title: Hello World`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("title");
        expect(parser.properties[0].value).toBe("Hello World");
    });

    /** Parses multiline property with plain text continuation */
    it("parses multiline property with plain text", () => {
        const input = `description: First line
Second line
Third line`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("description");
        expect(parser.properties[0].value).toBe("First line\nSecond line\nThird line");
    });

    /** Parses property followed by fenced code block */
    it("parses property with codefence", () => {
        const input = `example: some code
\`\`\`
const x = 42;
console.log(x);
\`\`\``;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("example");
        expect(parser.properties[0].value).toBe("some code\n```\nconst x = 42;\nconsole.log(x);\n```");
    });

    /** Parses multiple properties including fenced blocks */
    it("parses multiple properties and fences", () => {
        const input = `
title: Example
description: starts here
continues here
\`\`\`
code block line
another line
\`\`\`
footer: done
`.trim();

        const parser = new CodeblockParser(input);
        const props = parser.properties;

        expect(props).toHaveLength(3);
        expect(props[0].name).toBe("title");
        expect(props[0].value).toBe("Example");

        expect(props[1].name).toBe("description");
        expect(props[1].value).toBe("starts here\ncontinues here\n```\ncode block line\nanother line\n```");

        expect(props[2].name).toBe("footer");
        expect(props[2].value).toBe("done");
    });

    /** Throws if input is not a string */
    it("throws error if input is not a string", () => {
        // @ts-expect-error
        expect(() => new CodeblockParser(123)).toThrow("Codeblock source must be a string.");
    });

    /** Throws if input is empty or whitespace only */
    it("throws error on empty input", () => {
        expect(() => new CodeblockParser("   \n   \n")).toThrow("Codeblock is empty or has only whitespaces.");
    });

    /** Throws if codeblock starts without property */
    it("throws error if codeblock starts without property", () => {
        expect(() => new CodeblockParser("no-colon here")).toThrow(/codeblock must start with a property/i);
    });

    /** Throws if codefence starts and never ends */
    it("throws error if codefence is not closed", () => {
        const input = `code: intro
\`\`\`
function()`;
        expect(() => new CodeblockParser(input)).toThrow(/Unexpected end of input/i);
    });

    /** Throws if text exists with no active property */
    it("throws error when property text exists without current property", () => {
        const parser = new CodeblockParser("title: test");
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

    /** Parses codefence with more than three backticks */
    it("parses codefence with 4 backticks", () => {
        const input = `
snippet: usage
\`\`\`\`
line 1
line 2
\`\`\`\`
`.trim();

        const parser = new CodeblockParser(input);
        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].value).toBe("usage\n````\nline 1\nline 2\n````");
    });

    /** Property with colon in value */
    it("parses property with colon in value", () => {
        const input = `note: This is a note: with a colon`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("note");
        expect(parser.properties[0].value).toBe("This is a note: with a colon");
    });

    /** Codefence with language annotation is preserved as text */
    it("parses codefence with language annotation as text", () => {
        const input = `example: with lang
\`\`\`js
console.log("Hello");
\`\`\``;

        const parser = new CodeblockParser(input);
        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].value).toBe('with lang\n```js\nconsole.log("Hello");\n```');
    });

    /** Parses property with hyphenated name */
    it("parses property with hyphenated name", () => {
        const input = `custom-key: some value`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("custom-key");
        expect(parser.properties[0].value).toBe("some value");
    });

    /** Parses property and ignores trailing empty lines */
    it("parses property and ignores trailing empty lines", () => {
        const input = `key: value\n\n\n`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].value).toBe("value");
    });

    /** Parses multiple sequential code blocks in different properties */
    it("parses multiple code blocks in different properties", () => {
        const input = `
alpha: start
\`\`\`
code A
\`\`\`
beta: next
\`\`\`
code B
\`\`\`
`.trim();

        const parser = new CodeblockParser(input);
        expect(parser.properties).toHaveLength(2);
        expect(parser.properties[0].value).toBe("start\n```\ncode A\n```");
        expect(parser.properties[1].value).toBe("next\n```\ncode B\n```");
    });

    /** Parses property with whitespace-only value */
    it("parses property with whitespace-only value", () => {
        const input = `blank:    `;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("blank");
        expect(parser.properties[0].value).toBe("");
    });

    /**
     * This test checks that a single duplicate property key ("description")
     * triggers an error during validation.
     */
    it("throws an error for a single duplicate property", () => {
        const input = `
            title: Hello
            description: This is the first description.
            description: This is a duplicate.
            \`\`\`
            code block here
            \`\`\`
        `;

        expect(() => {
            const parser = new CodeblockParser(input);
            // Call internal method directly since it's not called automatically
            (parser as any)._validateProperties();
        }).toThrow(/Duplicate properties found: description/);
    });

    /**
     * This test verifies that multiple duplicate keys ("title" and "notes")
     * are all reported in the error message.
     */
    it("throws an error listing multiple duplicate properties", () => {
        const input = `
            title: A
            notes: First
            title: B
            notes: Second
            \`\`\`
            some code
            \`\`\`
        `;

        expect(() => {
            const parser = new CodeblockParser(input);
            (parser as any)._validateProperties(); // validate duplicates manually
        }).toThrow(/Duplicate properties found: title, notes/);
    });

    /**
     * This test confirms that no error is thrown when all property keys are unique.
     */
    it("does not throw when all properties are unique", () => {
        const input = `
            title: Unique
            description: All different
            author: Someone
            \`\`\`
            code goes here
            \`\`\`
        `;

        const parser = new CodeblockParser(input);
        expect(() => {
            (parser as any)._validateProperties(); // should not throw
        }).not.toThrow();
    });
});

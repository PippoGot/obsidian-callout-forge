import { CodeblockParser } from '../data/codeblock-parser';

describe("CodeblockParser", () => {

    // Parses a basic single-line property
    it("parses single-line property", () => {
        const input = `title: Hello World`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("title");
        expect(parser.properties[0].value).toBe("Hello World");
    });

    // Parses multiline property with plain text continuation
    it("parses multiline property with plain text", () => {
        const input = `description: First line\nSecond line\nThird line`;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("description");
        expect(parser.properties[0].value).toBe("First line\nSecond line\nThird line");
    });

    // Parses property followed by fenced code block
    it("parses property with codefence", () => {
        const input = `example: some code\n\`\`\`\nconst x = 42;\nconsole.log(x);\n\`\`\``;
        const parser = new CodeblockParser(input);

        expect(parser.properties).toHaveLength(1);
        expect(parser.properties[0].name).toBe("example");
        expect(parser.properties[0].value).toBe("some code\n\`\`\`\nconst x = 42;\nconsole.log(x);\n\`\`\`");
    });

    // Parses multiple properties including fenced blocks
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
        expect(props[1].value).toBe("starts here\ncontinues here\n\`\`\`\ncode block line\nanother line\n\`\`\`");

        expect(props[2].name).toBe("footer");
        expect(props[2].value).toBe("done");
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
        expect(() => new CodeblockParser("no-colon here")).toThrow(/codeblock must start with a property/i);
    });

    // Throws if codefence starts and never ends
    it("throws error if codefence is not closed", () => {
        const input = `code: intro\n\`\`\`\nfunction()`;
        expect(() => new CodeblockParser(input)).toThrow(/expected closing codefence/i);
    });

    // Throws if text exists with no active property
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

    // Parses codefence with more than three backticks
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
        expect(parser.properties[0].value).toBe("usage\n\`\`\`\`\nline 1\nline 2\n\`\`\`\`");
    });
});

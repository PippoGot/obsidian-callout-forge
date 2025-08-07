import { CodeblockProperty } from "../codeblock-engine/property";
import { TemplateCompiler } from "../template-engine/compiler";
import { TemplateParser } from "../template-engine/parser";
import { CalloutForgeError } from "../utils/errors";
import { Codeblock } from "../utils/types";

describe("TemplateCompiler", () => {
    const parser = new TemplateParser();
    const compiler = new TemplateCompiler();

    it("replaces required token with codeblock value", () => {
        const tokens = parser.parse("Hello {{ name }}!");
        const codeblock: Codeblock = [
            new CodeblockProperty("name", "Alice")
        ];

        const compiled = compiler.compile(tokens, codeblock);
        expect(compiled).toBe("Hello <div class=\"cf-markdown\">Alice</div>!");
    });

    it("uses fallback when codeblock value is missing", () => {
        const tokens = parser.parse("Hello {{ name | Stranger }}!");
        const compiled = compiler.compile(tokens, []);
        expect(compiled).toBe("Hello Stranger!");
    });

    it("uses empty string for optional token when missing", () => {
        const tokens = parser.parse("Hello {{ name? }}!");
        const compiled = compiler.compile(tokens, []);
        expect(compiled).toBe("Hello !");
    });

    it("throws error if required token is missing", () => {
        const tokens = parser.parse("Hello {{ name }}!");
        expect(() => compiler.compile(tokens, []))
            .toThrow(new CalloutForgeError('Missing value for required key "name"'));
    });

    it("renders multiple tokens in correct order", () => {
        const tokens = parser.parse("{{ greeting }} {{ name | Stranger }}!");
        const codeblock: Codeblock = [
            new CodeblockProperty("greeting", "Hi")
        ];

        const compiled = compiler.compile(tokens, codeblock);
        expect(compiled).toBe('<div class="cf-markdown">Hi</div> Stranger!');
    });
});

import { TemplateParser } from "../template-engine/parser";
import { FallbackToken, OptionalToken, RequiredToken, TextToken } from "../template-engine/token";
import { CalloutForgeError } from "../utils/errors";

describe("TemplateParser", () => {

    // Parses plain text with no handlebars
    it("parses plain text without handlebars", () => {
        const parser = new TemplateParser("Hello world");
        const template = parser.template;

        expect(template.tokens).toHaveLength(1);
        expect(template.tokens[0]).toBeInstanceOf(TextToken);
        expect((template.tokens[0] as TextToken).content).toBe("Hello world");
    });

    // Parses required handlebar token {{ name }}
    it("parses required handlebar syntax", () => {
        const parser = new TemplateParser("Hello {{ name }}!");
        const template = parser.template;

        expect(template.tokens).toHaveLength(3);
        expect(template.tokens[1]).toBeInstanceOf(RequiredToken);
        expect((template.tokens[1] as RequiredToken).key).toBe("name");
    });

    // Parses optional handlebar token {{ name? }}
    it("parses optional handlebar syntax", () => {
        const parser = new TemplateParser("Optional: {{ name? }}");
        const token = parser.template.tokens[1];

        expect(token).toBeInstanceOf(OptionalToken);
        expect((token as OptionalToken).key).toBe("name");
    });

    // Parses fallback handlebar token {{ name | default }}
    it("parses fallback handlebar syntax", () => {
        const parser = new TemplateParser("Fallback: {{ name | default }}");
        const token = parser.template.tokens[1];

        expect(token).toBeInstanceOf(FallbackToken);
        expect((token as FallbackToken).key).toBe("name");
        expect((token as FallbackToken).fallback).toBe("default");
    });
});

describe("Template.compile", () => {

    // Replaces required token with matching Pair value
    it("replaces required handlebar with pair value", () => {
        const parser = new TemplateParser("Hello {{ name }}!");
        const template = parser.template;

        const pairs = [new Pair("name", "Alice")];
        const result = template.compile(pairs);

        expect(result).toBe('Hello <div class="cf-markdown">Alice</div>!');
    });

    // Uses fallback value when pair is missing
    it("uses fallback for fallback token when no pair is provided", () => {
        const parser = new TemplateParser("Hello {{ name | Stranger }}!");
        const result = parser.template.compile([]);

        expect(result).toBe("Hello Stranger!");
    });

    // Uses empty string for missing optional token
    it("uses empty string for optional token when no pair is provided", () => {
        const parser = new TemplateParser("Hello {{ name? }}!");
        const result = parser.template.compile([]);

        expect(result).toBe("Hello !");
    });

    // Throws when required token has no matching pair
    it("throws error when required pair is missing", () => {
        const parser = new TemplateParser("Hello {{ name }}!");
        expect(() => parser.template.compile([]))
            .toThrow(new CalloutForgeError('Missing value for required key "name"'));
    });

    // Compiles multiple tokens in correct order
    it("renders multiple tokens in correct order", () => {
        const parser = new TemplateParser("{{ greeting }} {{ name | Stranger }}!");
        const pairs = [new Pair("greeting", "Hi")];
        const result = parser.template.compile(pairs);

        expect(result).toBe('<div class="cf-markdown">Hi</div> Stranger!');
    });
});

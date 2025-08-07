import { TemplateParser } from "../template-engine/parser";
import { FallbackToken, OptionalToken, RequiredToken, TextToken } from "../template-engine/token";

describe("TemplateParser", () => {
    const parser = new TemplateParser();

    it("parses plain text without handlebars", () => {
        const tokens = parser.parse("Hello world");

        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toBeInstanceOf(TextToken);
        expect((tokens[0] as TextToken).content).toBe("Hello world");
    });

    it("parses required handlebar syntax", () => {
        const tokens = parser.parse("Hello {{ name }}!");
        expect(tokens[1]).toBeInstanceOf(RequiredToken);
        expect((tokens[1] as RequiredToken).key).toBe("name");
    });

    it("parses optional handlebar syntax", () => {
        const tokens = parser.parse("Hello {{ name? }}!");
        expect(tokens[1]).toBeInstanceOf(OptionalToken);
        expect((tokens[1] as OptionalToken).key).toBe("name");
    });

    it("parses fallback handlebar syntax", () => {
        const tokens = parser.parse("Hello {{ name | Guest }}!");
        const token = tokens[1];

        expect(token).toBeInstanceOf(FallbackToken);
        expect((token as FallbackToken).key).toBe("name");
        expect((token as FallbackToken).fallback).toBe("Guest");
    });

    it("parses multiple mixed tokens", () => {
        const tokens = parser.parse("Hi {{ name }} ({{ age? }}) or {{ alias | N/A }}");

        expect(tokens).toHaveLength(6);
        expect(tokens[1]).toBeInstanceOf(RequiredToken);
        expect(tokens[3]).toBeInstanceOf(OptionalToken);
        expect(tokens[5]).toBeInstanceOf(FallbackToken);
    });
});

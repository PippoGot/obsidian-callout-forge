import { CalloutForgeError } from 'errors';
import { Template } from '../template-module/template';
import { DefaultedToken, OptionalToken, RequiredToken, TokenSyntax } from '../template-module/token';

describe('Template class', () => {

    // Group tests related to the static build() method
    describe('test build() method', () => {

        // Test that required tokens are parsed correctly
        it('parses required tokens correctly', () => {
            const input = "Hello {{user-name}}!";

            // Build the Template instance from the input string
            const template = Template.build(input);

            // We expect exactly one token found in the template
            expect(template.tokens).toHaveLength(1);

            // The token should be an instance of RequiredToken
            expect(template.tokens[0]).toBeInstanceOf(RequiredToken);

            // The token's name should match what was inside the braces
            expect(template.tokens[0].name).toBe('user-name');

            // The original source string should be trimmed but otherwise unchanged
            expect(template.sourceString).toBe(input.trim());
        });

        // Test that optional tokens (with ?) are parsed correctly
        it('parses optional tokens correctly', () => {
            const input = "Email: {{email?}}";
            const template = Template.build(input);

            // We expect one token
            expect(template.tokens).toHaveLength(1);

            // The token should be OptionalToken
            expect(template.tokens[0]).toBeInstanceOf(OptionalToken);

            // The token name should be 'email'
            expect(template.tokens[0].name).toBe('email');
        });

        // Test that tokens with default values (| default) are parsed correctly
        it('parses defaulted tokens correctly', () => {
            const input = "Locale: {{locale | en-US}}";
            const template = Template.build(input);

            expect(template.tokens).toHaveLength(1);

            // The token should be DefaultedToken
            expect(template.tokens[0]).toBeInstanceOf(DefaultedToken);

            // Name should be 'locale'
            expect(template.tokens[0].name).toBe('locale');

            // The default value property should be 'en-US'
            expect((template.tokens[0] as DefaultedToken).defaultValue).toBe('en-US');
        });

        // Test parsing a string containing multiple tokens of different types
        it('parses multiple mixed tokens correctly', () => {
            const input = "Hello {{user}}! Email: {{email?}} ({{locale | en-US}})";
            const template = Template.build(input);

            // We expect exactly 3 tokens parsed
            expect(template.tokens).toHaveLength(3);

            // The first token should be RequiredToken
            expect(template.tokens[0]).toBeInstanceOf(RequiredToken);

            // The second token should be OptionalToken
            expect(template.tokens[1]).toBeInstanceOf(OptionalToken);

            // The third token should be DefaultedToken
            expect(template.tokens[2]).toBeInstanceOf(DefaultedToken);
        });

        // Test the case where the string has no tokens at all
        it('returns empty token list if no tokens present', () => {
            const input = "Just a plain string without tokens";

            // Build Template instance
            const template = Template.build(input);

            // The tokens array should be empty
            expect(template.tokens).toHaveLength(0);
        });


    });

    // Group tests related to the appendTokenSyntax static method
    describe('test appendTokenSyntax() method', () => {

        // Define a dummy token syntax to test adding new syntaxes
        const dummySyntax: TokenSyntax = {
            name: 'dummy',
            regex: /\{\{dummy-([a-z]+)\}\}/g,
            extract: (match) => new RequiredToken(match[1]),
        };

        // Cleanup: After each test, remove the dummy token syntax if it was added
        // This keeps tests isolated and prevents side effects between tests
        afterEach(() => {
            (Template as any)._tokenSyntaxes = (Template as any)._tokenSyntaxes.filter(
                (s: TokenSyntax) => s.name !== 'dummy'
            );
        });

        // Test adding a new unique token syntax should work without error
        it('adds a new unique token syntax successfully', () => {
            // Append the dummy syntax
            Template.appendTokenSyntax(dummySyntax);

            // Retrieve the private _tokenSyntaxes array (cast to any to bypass TS visibility)
            const syntaxes = (Template as any)._tokenSyntaxes as TokenSyntax[];

            // Assert that the dummy syntax now exists inside the array
            expect(syntaxes.find(s => s.name === 'dummy')).toBeDefined();
        });

        // Test that adding a token syntax with a duplicate name throws the correct error
        it('throws error when adding a token syntax with duplicate name', () => {
            // First add dummy syntax
            Template.appendTokenSyntax(dummySyntax);

            // Attempt to add a new syntax with the same name 'dummy' but different regex
            expect(() => {
                Template.appendTokenSyntax({
                    name: 'dummy',  // duplicate name
                    regex: /\{\{dummy2-([a-z]+)\}\}/g,
                    extract: (m) => new OptionalToken(m[1]),
                });
            }).toThrow(CalloutForgeError);  // Expect CalloutForgeError to be thrown
        });

        // Test that adding a token syntax with a duplicate regex throws the correct error
        it('throws error when adding a token syntax with duplicate regex', () => {
            // First add dummy syntax
            Template.appendTokenSyntax(dummySyntax);

            // Attempt to add a syntax with a different name but same regex pattern
            expect(() => {
                Template.appendTokenSyntax({
                    name: 'dummy2',
                    regex: /\{\{dummy-([a-z]+)\}\}/g,  // same regex as dummySyntax
                    extract: (m) => new OptionalToken(m[1]),
                });
            }).toThrow(CalloutForgeError);  // Expect error to be thrown
        });
    });

    // Group tests related to the normalizedTemplateString getter
    describe('test normalizedTemplateString getter', () => {

        // Test that required tokens remain unchanged in normalization
        it('leaves required tokens unchanged in normalization', () => {
            const input = "Hello {{user}}!";
            const template = Template.build(input);

            // The normalized string should be identical to the original
            expect(template.normalizedTemplateString).toBe("Hello {{ user }}!");
        });

        // Test that optional tokens are converted to required syntax
        it('normalizes optional tokens to required syntax', () => {
            const input = "Email: {{email?}}";
            const template = Template.build(input);

            // Optional token should be transformed to required format
            expect(template.normalizedTemplateString).toBe("Email: {{ email }}");
        });

        // Test that defaulted tokens are also normalized to required format
        it('normalizes defaulted tokens to required syntax', () => {
            const input = "Locale: {{locale | en-US}}";
            const template = Template.build(input);

            // Defaulted token should be normalized
            expect(template.normalizedTemplateString).toBe("Locale: {{ locale }}");
        });

        // Test normalization of a string containing mixed token types
        it('normalizes mixed tokens correctly', () => {
            const input = "Hello {{user}}! Email: {{email?}} ({{locale | en-US}})";
            const template = Template.build(input);

            // All tokens should be converted to required syntax
            expect(template.normalizedTemplateString)
                .toBe("Hello {{ user }}! Email: {{ email }} ({{ locale }})");
        });

        // Test normalization of strings with repeated and varied spacing
        it('normalizes tokens with extra spaces consistently', () => {
            const input = "Test: {{   foo   ?  }} and {{  bar |   value   }}";
            const template = Template.build(input);

            // Extra whitespace should not affect the normalization output
            expect(template.normalizedTemplateString)
                .toBe("Test: {{ foo }} and {{ bar }}");
        });

        // Test that strings without any tokens are returned unchanged
        it('returns original string if no tokens present', () => {
            const input = "Plain string with no tokens";
            const template = Template.build(input);

            // Normalized string should be the same
            expect(template.normalizedTemplateString).toBe(input);
        });
    });

});

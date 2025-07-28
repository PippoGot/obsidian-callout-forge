import { Template } from '../template/template';
import { DefaultedToken, OptionalToken, RequiredToken, TokenSyntax } from '../template/token';
import { CalloutForgeError } from '../utils/errors';

describe('Template class', () => {

    // Group tests related to the static fromString() method
    describe('test build() method', () => {

        // Test that required tokens are parsed correctly
        it('parses required tokens correctly', () => {
            const input = "Hello {{user-name}}!";

            // Build the Template instance from the input string
            const template = Template.fromString(input);

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
            const template = Template.fromString(input);

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
            const template = Template.fromString(input);

            expect(template.tokens).toHaveLength(1);

            // The token should be DefaultedToken
            expect(template.tokens[0]).toBeInstanceOf(DefaultedToken);

            // Name should be 'locale'
            expect(template.tokens[0].name).toBe('locale');

            // The default value property should be 'en-US'
            expect((template.tokens[0] as DefaultedToken).defaultValue).toBe('en-US');
        });

        // Test the case where the string has no tokens at all
        it('returns empty token list if no tokens present', () => {
            const input = "Just a plain string without tokens";

            // Build Template instance
            const template = Template.fromString(input);

            // The tokens array should be empty
            expect(template.tokens).toHaveLength(0);
        });

        // Test that build throws error on duplicate token names with different subclasses
        it('throws error when tokens have same name but different subclasses', () => {
            const input = "Hello {{user}} and {{user?}}"; // Required and Optional with same name

            expect(() => Template.fromString(input)).toThrow(CalloutForgeError);
        });

        // Test that build throws error on duplicate token names with same subclass but different default values
        it('throws error when tokens have same name and subclass but different default values', () => {
            const input = "Value: {{value | 123}} and {{value | 456}}"; // Two DefaultedTokens, diff defaults

            expect(() => Template.fromString(input)).toThrow(CalloutForgeError);
        });

        // Test that build allows multiple tokens with the same name and equivalent properties
        it('allows multiple tokens with same name and equivalent properties', () => {
            const input = "Hello {{user}} and {{user}}"; // Duplicate RequiredTokens with same name

            const template = Template.fromString(input);

            // Only one token should be kept
            expect(template.tokens).toHaveLength(1);
            expect(template.tokens[0]).toBeInstanceOf(RequiredToken);
            expect(template.tokens[0].name).toBe('user');
        });

        // Test that build allows tokens with different names without conflict
        it('parses multiple tokens with different names without conflict', () => {
            const input = "Hello {{user}} and {{email?}} and {{locale | en-US}}";

            const template = Template.fromString(input);

            expect(template.tokens).toHaveLength(3);

            expect(template.tokens[0]).toBeInstanceOf(RequiredToken);
            expect(template.tokens[0].name).toBe('user');

            expect(template.tokens[1]).toBeInstanceOf(OptionalToken);
            expect(template.tokens[1].name).toBe('email');

            expect(template.tokens[2]).toBeInstanceOf(DefaultedToken);
            expect(template.tokens[2].name).toBe('locale');
            expect((template.tokens[2] as DefaultedToken).defaultValue).toBe('en-US');
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
    });

    // Group tests related to the normalizedTemplateString getter
    describe('test normalizedTemplateString getter', () => {

        // Test that required tokens remain unchanged in normalization
        it('leaves required tokens unchanged in normalization', () => {
            const input = "Hello {{user}}!";
            const template = Template.fromString(input);

            // The normalized string should be identical to the original
            expect(template.normalizedTemplateString).toBe("Hello {{ user }}!");
        });

        // Test that optional tokens are converted to required syntax
        it('normalizes optional tokens to required syntax', () => {
            const input = "Email: {{email?}}";
            const template = Template.fromString(input);

            // Optional token should be transformed to required format
            expect(template.normalizedTemplateString).toBe("Email: {{ email }}");
        });

        // Test that defaulted tokens are also normalized to required format
        it('normalizes defaulted tokens to required syntax', () => {
            const input = "Locale: {{locale | en-US}}";
            const template = Template.fromString(input);

            // Defaulted token should be normalized
            expect(template.normalizedTemplateString).toBe("Locale: {{ locale }}");
        });

        // Test normalization of a string containing mixed token types
        it('normalizes mixed tokens correctly', () => {
            const input = "Hello {{user}}! Email: {{email?}} ({{locale | en-US}})";
            const template = Template.fromString(input);

            // All tokens should be converted to required syntax
            expect(template.normalizedTemplateString)
                .toBe("Hello {{ user }}! Email: {{ email }} ({{ locale }})");
        });

        // Test normalization of strings with repeated and varied spacing
        it('normalizes tokens with extra spaces consistently', () => {
            const input = "Test: {{   foo   ?  }} and {{  bar |   value   }}";
            const template = Template.fromString(input);

            // Extra whitespace should not affect the normalization output
            expect(template.normalizedTemplateString)
                .toBe("Test: {{ foo }} and {{ bar }}");
        });

        // Test that strings without any tokens are returned unchanged
        it('returns original string if no tokens present', () => {
            const input = "Plain string with no tokens";
            const template = Template.fromString(input);

            // Normalized string should be the same
            expect(template.normalizedTemplateString).toBe(input);
        });
    });

});

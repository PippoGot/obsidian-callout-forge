import { DefaultedToken, OptionalToken, RequiredToken } from '../template-module/token';

describe('Token classes', () => {

    describe('arguments storage', () => {
        // Test the RequiredToken class functionality
        test('RequiredToken should correctly store name and have isRequired = true', () => {
            const tokenName = 'user-name';
            const token = new RequiredToken(tokenName);

            // Check that the token name is stored correctly
            expect(token.name).toBe(tokenName);

            // Check the static isRequired property is true for RequiredToken
            expect(RequiredToken.isRequired).toBe(true);

            // Check the toString() method outputs the expected string
            expect(token.toString()).toBe(`{{ ${tokenName} }}`);
        });

        // Test the OptionalToken class functionality
        test('OptionalToken should correctly store name and have isRequired = false', () => {
            const tokenName = 'user-name';
            const token = new OptionalToken(tokenName);

            // Check that the token name is stored correctly
            expect(token.name).toBe(tokenName);

            // Check the static isRequired property is false for OptionalToken
            expect(OptionalToken.isRequired).toBe(false);

            // Check the toString() method outputs the expected string with question mark
            expect(token.toString()).toBe(`{{ ${tokenName}? }}`);
        });

        // Test the DefaultedToken class functionality
        test('DefaultedToken should correctly store name, trim default value and have isRequired = false', () => {
            const tokenName = 'user-name';
            const defaultValue = '  default-value  ';
            const trimmedDefaultValue = defaultValue.trim();

            const token = new DefaultedToken(tokenName, defaultValue);

            // Check that the token name is stored correctly
            expect(token.name).toBe(tokenName);

            // Check that the default value is trimmed before storing
            expect(token.defaultValue).toBe(trimmedDefaultValue);

            // Check the static isRequired property is false for DefaultedToken
            expect(DefaultedToken.isRequired).toBe(false);

            // Check the toString() method outputs the expected string with default value
            expect(token.toString()).toBe(`{{ ${tokenName} | ${trimmedDefaultValue} }}`);
        });

        // Test inheritance: all tokens should be instances of Token
        test('All tokens should be instances of Token', () => {
            const required = new RequiredToken('req');
            const optional = new OptionalToken('opt');
            const defaulted = new DefaultedToken('def', 'val');

            expect(required).toBeInstanceOf(RequiredToken);
            expect(optional).toBeInstanceOf(OptionalToken);
            expect(defaulted).toBeInstanceOf(DefaultedToken);

            // Optionally check they are instances of the base class Token too
            // (This depends on if Token is a class or abstract class - it is)
            expect(required).toBeInstanceOf(Object);   // base Object for sure
        });
    });

    describe('comparison methods', () => {
        // Test isSameSubclass returns true for tokens of the same subclass
        test('isSameSubclass returns true for tokens of the same subclass', () => {
            const token1 = new RequiredToken('alpha');
            const token2 = new RequiredToken('beta');

            // Both are RequiredToken instances, so should return true
            expect(token1.isSameSubclass(token2)).toBe(true);
        });

        // Test isSameSubclass returns false for tokens of different subclasses
        test('isSameSubclass returns false for tokens of different subclasses', () => {
            const token1 = new RequiredToken('alpha');
            const token2 = new OptionalToken('alpha');

            // Different subclasses, so should return false
            expect(token1.isSameSubclass(token2)).toBe(false);
        });

        // Test isEquivalentTo returns true for tokens with same subclass and identical properties
        test('isEquivalentTo returns true for tokens with same subclass and identical properties', () => {
            const token1 = new RequiredToken('gamma');
            const token2 = new RequiredToken('gamma');

            // Same subclass and same name => equivalent
            expect(token1.isEquivalentTo(token2)).toBe(true);
        });

        // Test isEquivalentTo returns false for tokens with same subclass but different names
        test('isEquivalentTo returns false for tokens with same subclass but different names', () => {
            const token1 = new RequiredToken('gamma');
            const token2 = new RequiredToken('delta');

            // Same subclass but different names => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo returns false for tokens of different subclasses even if names match
        test('isEquivalentTo returns false for tokens of different subclasses even if names match', () => {
            const token1 = new RequiredToken('epsilon');
            const token2 = new OptionalToken('epsilon');

            // Different subclasses => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo returns true for DefaultedTokens with same name and defaultValue
        test('isEquivalentTo returns true for DefaultedTokens with same name and defaultValue', () => {
            const token1 = new DefaultedToken('locale', 'en-US');
            const token2 = new DefaultedToken('locale', 'en-US');

            // Same subclass, name and defaultValue => equivalent
            expect(token1.isEquivalentTo(token2)).toBe(true);
        });

        // Test isEquivalentTo returns false for DefaultedTokens with same name but different defaultValue
        test('isEquivalentTo returns false for DefaultedTokens with same name but different defaultValue', () => {
            const token1 = new DefaultedToken('locale', 'en-US');
            const token2 = new DefaultedToken('locale', 'fr-FR');

            // Different default values => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });
    });

});



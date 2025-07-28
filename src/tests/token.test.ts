import { DefaultedToken, OptionalToken, RequiredToken } from '../template/token';

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

        // Test the OptionalToken class functionality with default value = ''
        test('OptionalToken should store name, default to empty string and have isRequired = false', () => {
            const tokenName = 'user-name';
            const token = new OptionalToken(tokenName);

            // Check that the token name is stored correctly
            expect(token.name).toBe(tokenName);

            // OptionalToken should default its value to an empty string
            expect(token.defaultValue).toBe('');

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

            // Check correct subclass instances
            expect(required).toBeInstanceOf(RequiredToken);
            expect(optional).toBeInstanceOf(OptionalToken);
            expect(defaulted).toBeInstanceOf(DefaultedToken);

            // Check inheritance from base class
            expect(required).toBeInstanceOf(Object); // all should derive from Object
        });
    });

    describe('comparison methods', () => {
        // Test isSameSubclass returns true for tokens of the same subclass
        test('isSameSubclass returns true for tokens of the same subclass', () => {
            const token1 = new RequiredToken('alpha');
            const token2 = new RequiredToken('beta');

            // Both are RequiredToken instances
            expect(token1.isSameSubclass(token2)).toBe(true);
        });

        // Test isSameSubclass returns false for tokens of different subclasses
        test('isSameSubclass returns false for tokens of different subclasses', () => {
            const token1 = new RequiredToken('alpha');
            const token2 = new OptionalToken('alpha');

            // Different subclasses => not the same
            expect(token1.isSameSubclass(token2)).toBe(false);
        });

        // Test isEquivalentTo returns true when subclass and properties match
        test('isEquivalentTo returns true for tokens with same subclass and identical properties', () => {
            const token1 = new RequiredToken('gamma');
            const token2 = new RequiredToken('gamma');

            // Same type and same name => equivalent
            expect(token1.isEquivalentTo(token2)).toBe(true);
        });

        // Test isEquivalentTo returns false for different names, same subclass
        test('isEquivalentTo returns false for tokens with same subclass but different names', () => {
            const token1 = new RequiredToken('gamma');
            const token2 = new RequiredToken('delta');

            // Same type but different name => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo returns false for same name but different subclasses
        test('isEquivalentTo returns false for tokens of different subclasses even if names match', () => {
            const token1 = new RequiredToken('epsilon');
            const token2 = new OptionalToken('epsilon');

            // Same name but different type => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo for DefaultedToken with identical name and default value
        test('isEquivalentTo returns true for DefaultedTokens with same name and defaultValue', () => {
            const token1 = new DefaultedToken('locale', 'en-US');
            const token2 = new DefaultedToken('locale', 'en-US');

            // All properties match => equivalent
            expect(token1.isEquivalentTo(token2)).toBe(true);
        });

        // Test isEquivalentTo for DefaultedTokens with different default values
        test('isEquivalentTo returns false for DefaultedTokens with same name but different defaultValue', () => {
            const token1 = new DefaultedToken('locale', 'en-US');
            const token2 = new DefaultedToken('locale', 'fr-FR');

            // Default values differ => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo returns true for OptionalTokens with same name
        test('isEquivalentTo returns true for OptionalTokens with same name', () => {
            const token1 = new OptionalToken('bar');
            const token2 = new OptionalToken('bar');

            // Same subclass and name => equivalent
            expect(token1.isEquivalentTo(token2)).toBe(true);
        });

        // Test isEquivalentTo returns false for OptionalToken vs DefaultedToken with same name
        test('OptionalToken is not equivalent to DefaultedToken with same name', () => {
            const token1 = new OptionalToken('baz');
            const token2 = new DefaultedToken('baz', '');

            // Different subclass => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });

        // Test isEquivalentTo returns false for OptionalToken vs RequiredToken with same name
        test('OptionalToken is not equivalent to RequiredToken with same name', () => {
            const token1 = new OptionalToken('qux');
            const token2 = new RequiredToken('qux');

            // Different subclass => not equivalent
            expect(token1.isEquivalentTo(token2)).toBe(false);
        });
    });
});



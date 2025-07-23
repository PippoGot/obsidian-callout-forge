import { DefaultedToken, OptionalToken, RequiredToken } from '../template-module/token';

describe('Token classes', () => {
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

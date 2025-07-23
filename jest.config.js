module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },
    moduleNameMapper: {
        '^template-module/(.*)$': '<rootDir>/src/template-module/$1',
        '^errors$': '<rootDir>/src/errors.ts',
    }
};

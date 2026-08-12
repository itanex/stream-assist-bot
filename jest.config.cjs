/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    extensionsToTreatAsEsm: ['.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest', {
                isolatedModules: true,
                useESM: true,
            },
        ],
    },
};

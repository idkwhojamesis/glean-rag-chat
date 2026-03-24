/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/packages', '<rootDir>/apps/mcp-server', '<rootDir>/apps/web'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.base.json'
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@glean-rag-chat/core$': '<rootDir>/packages/core/src/index.ts',
    '^@glean-rag-chat/core/(.*)$': '<rootDir>/packages/core/src/$1'
  }
};

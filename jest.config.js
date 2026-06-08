/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: '<rootDir>/tsconfig.test.json',
          diagnostics: false,
        }],
      },
      moduleNameMapper: {
        '^@kbn/core/server$': '<rootDir>/test-mocks/kbn-core-server.ts',
        '^@kbn/config-schema$': '<rootDir>/test-mocks/kbn-config-schema.ts',
      },
    },
    {
      displayName: 'public',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/public/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: '<rootDir>/tsconfig.test.json',
          diagnostics: false,
        }],
      },
      moduleNameMapper: {
        '^@kbn/core/public$': '<rootDir>/test-mocks/kbn-core-public.ts',
      },
    },
  ],
};
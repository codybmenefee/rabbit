module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['lib/**/*.ts'],
  setupFilesAfterEnv: [],
};

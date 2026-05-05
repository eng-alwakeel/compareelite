module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
  ],
  collectCoverageFrom: [
    'scripts/**/*.js',
    'lib/**/*.js',
    '!scripts/generate-*.js', // Generator scripts are tested via integration
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  verbose: true,
};

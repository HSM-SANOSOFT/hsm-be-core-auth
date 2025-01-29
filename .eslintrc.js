const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'simple-import-sort',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // Integrates Prettier with ESLint
    'eslint:recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  rules: {
    // TypeScript Rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all', // Check all variables
        args: 'after-used', // Check function arguments after they are used
        argsIgnorePattern: '^_', // Ignore variables starting with an underscore
        varsIgnorePattern: '^_', // Ignore variables starting with an underscore
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'error',

    // Import Sorting
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',

    // Prettier Integration
    'prettier/prettier': 'error',

    // General Code Quality Rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'eol-last': ['error', 'always'],
  },
};

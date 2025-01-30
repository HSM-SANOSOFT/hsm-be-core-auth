// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript Rules
      "no-unused-vars": "off",
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-use-before-define': 'error',

      "no-unused-expressions": "error",
      "@typescript-eslint/no-unused-expressions": "error",

      '@typescript-eslint/consistent-type-imports': 'error',
      "@typescript-eslint/triple-slash-reference": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      '@typescript-eslint/no-require-imports': 'error',

      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      //"@typescript-eslint/no-unsafe-argument": "error",
      //"@typescript-eslint/no-unsafe-assignment": "error",
      //"@typescript-eslint/no-unsafe-call": "error",
      //"@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',

      'strictNullChecks': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',

      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      "@typescript-eslint/no-unnecessary-template-expression": "error",
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",

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
  },
);
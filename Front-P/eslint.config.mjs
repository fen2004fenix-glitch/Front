import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // React configuration for JavaScript and TypeScript files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser, // Use TypeScript parser for all files
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
        // For TypeScript specific configuration, you can add:
        project: './tsconfig.json', // Optional: point to your tsconfig
      },
    },
    rules: {
      // React plugin recommended rules
      ...reactPlugin.configs.recommended.rules,
      // React Hooks plugin rules
      ...reactHooksPlugin.configs.recommended.rules,

      // Add additional rules or overrides here
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },

  // Optional: Separate configuration for TypeScript specific rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TypeScript specific rules can go here
    },
  },
];

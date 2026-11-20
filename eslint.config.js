import globals from 'globals';
import js from '@eslint/js';
import react from '@eslint-react/eslint-plugin';
import babelParser from '@babel/eslint-parser';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'entrega_preguntas_1_2/**', 'evidencias/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  {
    ...react.configs['recommended'],
    files: ['**/*.jsx'],
    languageOptions: {
      parser: babelParser,
      parserOptions: { requireConfigFile: false, babelOptions: { presets: ['@babel/preset-react'] } },
      globals: { ...globals.browser, ...globals.node },
    },
  },
];

const js = require('@eslint/js');
const vue = require('eslint-plugin-vue');
const prettier = require('eslint-plugin-prettier');
const babelParser = require('@babel/eslint-parser');

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  location: 'readonly',
  history: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Buffer: 'readonly',
  process: 'readonly',
};

const rules = {
  'vue/comment-directive': 'off',
  'vue/multi-word-component-names': 'off',
  'vue/max-attributes-per-line': ['error', { singleline: 5 }],  'object-curly-spacing': ['error', 'always'],
  'array-bracket-newline': ['error', { minItems: 5 }],
  'arrow-spacing': 'error',
  'vue/block-tag-newline': ['error', {
    singleline: 'always',
    multiline: 'always',
    maxEmptyLines: 0,
    blocks: {
      script: { singleline: 'always', multiline: 'always', maxEmptyLines: 0 },
      template: { singleline: 'always', multiline: 'always', maxEmptyLines: 0 },
      'my-block': { singleline: 'always', multiline: 'always', maxEmptyLines: 0 },
    },
  }],
  curly: 'error',
  'default-case': 'error',
  'no-multi-spaces': ['error', { ignoreEOLComments: true }],
  'no-unmodified-loop-condition': 'error',
  'no-use-before-define': 'error',
  indent: ['error', 2],
  'no-unneeded-ternary': 'error',
  quotes: ['error', 'single'],
  'space-unary-ops': 'error',
  'jsx-quotes': ['error', 'prefer-single'],
  'key-spacing': 'error',
  'brace-style': 'error',
  camelcase: 'error',
  'comma-dangle': ['error', 'always-multiline'],
  'max-lines': ['error', { max: 1000, skipComments: true }],
  'no-var': 'error',
  'vue/html-indent': ['error', 2],
};

module.exports = [
  {
    ignores: [
      '**/*.sh',
      '**/*.md',
      '**/*.woff',
      '**/*.ttf',
      '**/node_modules/**',
      '**/.vscode/**',
      '**/.idea/**',
      '**/dist/**',
      'docs/**',
      '.husky/**',
      '.local/**',
      'bin/**',
      'public/CViews/**',
      'stats.html',
    ],
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,jsx,vue}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: browserGlobals,
      parserOptions: {
        parser: babelParser,
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: ['@babel/preset-env'],
        },
      },
    },
    plugins: {
      prettier,
    },
    rules,
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: ['@babel/preset-env'],
        },
      },
    },
  },
];



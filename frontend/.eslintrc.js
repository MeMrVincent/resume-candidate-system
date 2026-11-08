// eslint-disable-next-line vue/script-setup-uses-vars
module.exports = {
  root: true,
  globals: {
    process: true,
  },
  parserOptions: {
    parser: '@babel/eslint-parser',
    sourceType: 'module',
    ecmaVersion: 12,
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    es6: true,
  },
  plugins: ['babel', 'prettier', 'vue'],
  extends: ['plugin:vue/recommended',
    'eslint:recommended'],
  rules: {
    'vue/comment-directive': 'off',
  'vue/multi-word-component-names': 'off',
    'vue/max-attributes-per-line': ['error', {
      singleline: 5, // 标签超出5个属性换行 / EN: Line break if tag exceeds 5 attributes / JA: 5つ以上の属性で改行
    }],
    'vue/script-setup-uses-vars': 'error', // setup 语法糖校验 / EN: Validate <script setup> variables / JA: <script setup> 構文糖の変数検証
    'object-curly-spacing': ['error', 'always'], // 对象前后加空格 { a: 1 } / EN: Space inside curly braces / JA: オブジェクト波括弧の内側に空白
    'array-bracket-newline': ['error', { 'minItems': 5 }], // 数组超过五个值换行 / EN: Line break if array items >= 5 / JA: 配列要素が5個以上で改行
    'arrow-spacing': 'error', // 箭头函数前后加空格 () => {} / EN: Spacing before/after arrow function / JA: アロー前後に空白
    // 'vue/no-unsupported-features': ['error', { // 校验不支持特性 / EN: Check unsupported features / JA: 未サポート機能の検証
    //   'version': "^3.0.0",
    //   'ignores': [],
    // }]
    'vue/block-tag-newline': ['error', { // 标签直接的换行规范 / EN: Block tag newline rule / JA: ブロックタグの改行ルール
      'singleline': 'always',
      'multiline': 'always',
      'maxEmptyLines': 0,
      'blocks': {
        'script': {
          'singleline': 'always',
          'multiline': 'always',
          'maxEmptyLines': 0,
        },
        'template': {
          'singleline': 'always',
          'multiline': 'always',
          'maxEmptyLines': 0,
        },
        'my-block': {
          'singleline': 'always',
          'multiline': 'always',
          'maxEmptyLines': 0,
        },
      },
    }],
    'curly': 'error',
    'default-case': 'error',
    'no-multi-spaces': ['error', { 'ignoreEOLComments': true }],
    'no-unmodified-loop-condition': 'error',
    'no-use-before-define': 'error',
    'indent': ['error', 2],
    'no-unneeded-ternary': 'error',
    'quotes': ['error', 'single'],
    'space-unary-ops': 'error',
    'jsx-quotes': ['error', 'prefer-single'],
    'key-spacing': 'error',
    'brace-style': 'error',
    'camelcase': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'max-lines': ['error', { 'max': 1000, 'skipComments': true }],
    'no-var': 'error',
    'vue/html-indent': ['error', 2],
  },
};


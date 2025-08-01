module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        'selector': 'import',
        'format': ['camelCase', 'PascalCase']
      }
    ],
    '@typescript-eslint/semi': 'warn',
    'curly': 'warn',
    'eqeqeq': 'warn',
    'no-throw-literal': 'warn',
    'semi': 'off'
  },
  ignorePatterns: [
    'out',
    'dist',
    '**/*.d.ts'
  ]
};

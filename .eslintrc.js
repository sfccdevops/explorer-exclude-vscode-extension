module.exports = {
    root: true,
    parserOptions: {
      parser: 'babel-eslint',
      ecmaVersion: 8,
    },
    env: {
      es6: true,
      node: true,
      browser: true,
      jest: true,
    },
    plugins: ['prettier'],
    extends: ['eslint:recommended', 'prettier'],
    rules: {
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          bracketSpacing: true,
          semi: false,
          printWidth: 500,
        },
      ],
      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],
      'no-console': 0,
      'no-control-regex': 0,
      'no-useless-escape': 0,
    },
    globals: {},
  }

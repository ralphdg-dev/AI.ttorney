// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Prevent incorrect import paths that reference the project root incorrectly
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/client/*', '../../client/*', '../../../client/*', '../../../../client/*'],
              message: 'Do not use absolute paths or paths that reference /client/ directory. Use relative paths (../) or path aliases (@/).',
            },
          ],
        },
      ],
    },
  },
]);

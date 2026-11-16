const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

const isLambda = process.env.BUILD_TARGET === 'lambda';

module.exports = {
  output: {
    path: join(__dirname, isLambda ? '../../dist/apps/api-lambda' : '../../dist/apps/api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && !isLambda && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: isLambda ? './src/lambda.ts' : './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: isLambda,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: !isLambda,
    }),
  ],
};

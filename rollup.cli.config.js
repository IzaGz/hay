import cli from 'rollup-plugin-cli';

export default {
  context: 'this',
  entry: 'dist/src/cli.js',
  dest: 'dist/bundle/hay.cli.umd.js',
  format: 'umd',
  moduleName: 'hay.cli',
  indent: true,
  globals: {
    'ansi-styles': 'ansiStyles',
    'chokidar': 'chokidar',
    'commander': 'commander',
    'express': 'express',
    'glob': 'glob',
    'fs': 'fs',
    'js-yaml': 'jsYaml',
    'mime': 'mime',
    'mkdirp': 'mkdirp',
    'path': 'path',
    'readline': 'readline',
    'rimraf': 'rimraf'
  },
  plugins: [ cli() ]
};

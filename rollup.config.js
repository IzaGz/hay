export default {
  context: 'this',
  entry: 'dist/index.js',
  dest: 'dist/bundle/hay.umd.js',
  format: 'umd',
  moduleName: 'hay',
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
  }
};

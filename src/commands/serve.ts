import * as commander from 'commander';
import * as path from 'path';
import * as mime from 'mime';

const express: any = require('express');

import { Hay } from '../hay';
import { BaseCommand } from './base';
import { BaleCommand } from './bale';
import { MemoryFileSystem, Folder } from '../files/memory';

export class ServeCommand extends BaseCommand {
  public baleCommand: BaleCommand;

  constructor(hay: Hay) {
    super(hay);

    hay.fileSystem = new MemoryFileSystem();

    this.baleCommand = new BaleCommand(this.hay);
  }

  static options(commander: commander.ICommand) {
    commander.usage('bale [flags]');
    commander.option('--watch', 'watch for changes');
  }

  public async run() {
    let server: any = express();
    await this.baleCommand.watch();

    if (this.hay.config.webpackConfig) {

      const webpack: any = require('webpack');
      const webpackMiddleware: any = require('webpack-dev-middleware');
      const hotMiddleware: any = require('webpack-hot-middleware');

      let webpackLogger = this.hay.reporter.i({ gutter: { styles: ['cyan'], text: 'webpack' } });

      webpackLogger('initialising');

      let webpackCompilerInstance = webpack(this.hay.config.webpackConfig);
      let webpackMiddlewareInstance = webpackMiddleware(
        webpackCompilerInstance,
        {
          publicPath: '/',
          log: (message: string) => {
            this.hay.reporter.info(message);
          },
          stats: 'errors-only',
          noInfo: true,
          serverSideRender: false
        }
      );

      server.use(webpackMiddlewareInstance);

      let hmrLogger = this.hay.reporter.i({
        gutter: {
          styles: ['magenta'],
          text: 'HMR'
        }
      });

      server.use(hotMiddleware(
        webpackCompilerInstance,
        {
          noInfo: true,
          reload: true,
          log: (message: string) => {
            hmrLogger(message);
          },
          path: '/__webpack_hmr',
          heartbeat: 10 * 1000,
          stats: 'errors-only'
        }
      ));

      let reloadLogger = this.hay.reporter.i({ gutter: { styles: ['yellow'], text: 'reloader' } });
    }

    const port: number = this.hay.config.values.port;

    server.use((req: any, res: any, next: Function) => {
      // first of all do not treat the request URL as a directory
      const url: string = req.url.slice(1);
      let filePath: string = path.resolve(this.hay.config.values.destination, url);
      let file: Folder = <Folder> (<MemoryFileSystem> this.hay.fileSystem).find(filePath);

      if (!file) {
        // file not found, let's treat the URL as a directory

        let dirPath: string = path.resolve(this.hay.config.values.destination, path.basename(req.url));
        let dir: Folder = <Folder> (<MemoryFileSystem> this.hay.fileSystem).find(dirPath);

        if (!dir) {
          return next();
        }

        if (typeof dir === 'string') {
          return res.end(dir, 'binary');
        }

        if (dir[req.url]) {
          return res.end(dir[req.url], 'binary');
        }

        return next();
      }

      if (typeof file === 'string') {
        res.writeHead(200, { 'Content-Type': mime.lookup(url) });
        return res.end(file, 'binary');
      }

      if (file['index.html']) {
        res.set('Content-Type', mime.lookup('.html'));

        return res.end(file['index.html']);
      }

      return next();
    });

    server.use((req: any, res: any) => {
      const { config, fileSystem } = this.hay;

      const notFoundPage: string = path.resolve(config.values.destination, '404.html');
      const errorPage: string = <string> (<MemoryFileSystem> fileSystem).find(notFoundPage);

      res.end(errorPage || 'cannot find file');
    });

    server.listen(port);

    this.hay.reporter.info(`running local server at http://localhost:${port}`);
  }
}

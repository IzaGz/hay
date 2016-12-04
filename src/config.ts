import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Reporter } from './reporter';

export interface ConfigValues {
  autoPermalink: boolean;
  destination: string;
  engine: string;
  exclude: string[];
  googleAnalytics: string;
  highlighter: string;
  markdownExtensions: string[];
  parsers: string[];
  partialsDir?: string;
  partialExtensions?: string[];
  layoutsDir?: string;
  layoutExtensions?: string[];
  lrPort: number,
  gfm: boolean;
  noProgress: boolean;
  pluginsDir: string[];
  pluginsFormat: string[];
  port: number;
  postsDir?: string;
  postExtensions?: string[];
  postOutput: string;
  source: string;
  suppressLevel: number;
  webpackConfig: string;
  [x: string]: any;
};

const values: ConfigValues = {
  autoPermalink: true,
  destination: 'build',
  engine: 'liquid',
  exclude: [],
  googleAnalytics: '',
  highlighter: 'highlight.js',
  lrPort: 35729,
  markdownExtensions: ['md'],
  parsers: ['marked'],
  pluginsDir: ['{cwd}/node_modules'],
  pluginsFormat: ['hay-{name}-{prefix}'],
  gfm: true,
  noProgress: false,
  port: 3000,
  postOutput: 'directory',
  source: '.',
  suppressLevel: 0,
  webpackConfig: ''
};

interface ConfigLoaders {
  [x: string]: (filename: string) => any;
}

type pluginToLoad = {
  prefix: string,
  name: string,
  loaded: boolean,
  files?: string[]
};

const CONFIG_NAMES: string[] = [
  'hay.config.js',
  'hay.config.json',
  'hay.config.yml',
  'config.yml',
  '.hayrc'
];

const merge = ([first, ...rest]): string[] => {
  if (!first) {
    return [];
  } else if (!Array.isArray(first)) {
    return [first, ...merge(rest)];
  } else {
    return [...merge(first), ...merge(rest)];
  }
}

const combine = (join: string, ...args: string[][]): string[] => {
  return [].concat(
    ...(<any> args).reduce((into: string[], from: string[]) => {
      return merge(into.map((nextKey: string) => {
        return from.map((fromKey: string) => {
          return [nextKey, fromKey].join(join);
        })
      }));
    })
  );
}

export interface Plugins {
  engine: {
    [x: string]: any;
  };
  parser: {
    [x: string]: any;
  };
};

export class Config {
  public reporter: Reporter;
  public values: ConfigValues = values;
  public webpackConfig: any;
  public plugins: Plugins = {
    engine: {},
    parser: {}
  };

  public async loadConfig(overrideObj: any = {}): Promise<any> {
    let files: ConfigValues[] = await Promise.all(CONFIG_NAMES.map((fileName: string) => this.loadFile(fileName)));
    files = files.filter((item: any) => !!item);

    files.map((file: ConfigValues) => {
      Object.keys(values).forEach((item: string) => {
        if (overrideObj[item]) {
          file[item] = overrideObj[item];
        }
      });
      return file;
    });

    await Promise.all(files.map((file: any) => this.addToSelf(file)));
    return this.loadPlugins();
  }

  public logInfo(reporter: any) {
    reporter({gutterStyles: ['white'], gutterText: 'hay config', hideColons: true})('');

    reporter({
      gutter: {
        styles: ['gray'],
        text: 'source'
      }
    })(`<dim>${this.values.source}</dim>`);
    if (this.values.postsDir) {
      reporter({
        gutter: {
          styles: ['gray'],
          text: 'posts'
        }
      })(`<dim>${this.values.postsDir}</dim>`);
    }
    if (this.values.layoutsDir) {
      reporter({
        gutter: {
          styles: ['gray'],
          text: 'layouts'
        }
      })(`<dim>${this.values.layoutsDir}</dim>`);
    }
    if (this.values.partialsDir) {
      reporter({
        gutter: {
          styles: ['gray'],
          text: 'partials'
        }
      })(`<dim>${this.values.partialsDir}</dim>`);
    }
    reporter('\n');
    reporter({
      gutter: {
        styles: ['gray'],
        text: 'destination'
      }
    })(`<dim>${this.values.destination}</dim>\n`);
  }

  public resolvePaths() {
    let cwd: string = process.cwd();

    this.values.source = path.resolve(cwd, this.values.source);
    if (this.values.postsDir) {
      this.values.postsDir = path.resolve(this.values.source, this.values.postsDir);
    }
    if (this.values.layoutsDir) {
      this.values.layoutsDir = path.resolve(this.values.source, this.values.layoutsDir);
    }
    if (this.values.partialsDir) {
      this.values.partialsDir = path.resolve(this.values.source, this.values.partialsDir);
    }
    this.values.destination = path.resolve(cwd, this.values.destination);
  }

  public setReporter(reporter: Reporter) {
    this.reporter = reporter;
  }

  private addToSelf(config: { [x: string]: any }) {
    for (let i in config) {
      if (Object.prototype.hasOwnProperty.call(config, i)) {
        this.values[i] = config[i];
      }
    }
    return this;
  }

  private async loadPlugins(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let pluginsToLoad: pluginToLoad[] = [];

      // template engine
      pluginsToLoad.push({ prefix: 'engine', name: this.values.engine, loaded: false });
      // template parser
      pluginsToLoad.push(...this.values.parsers.map((parser: string) => {
        return { prefix: 'parser', name: parser, loaded: false };
      }));

      let directories: string[] = this.values.pluginsDir.map(
        (dir: string) => {
          return dir
            .replace(/{cwd}/gi, process.cwd);
        });

      pluginsToLoad.forEach((plugin: pluginToLoad) => {
        let folderNames: string[] = this.values.pluginsFormat.map((format: string) => {
          return format
            .replace(/{prefix}/gi, plugin.prefix)
            .replace(/{name}/gi, plugin.name);
        });

        let files: string[] = merge([
          // directory {dir}/{format}
          combine('/', directories, folderNames),
          // directory {dir}/{name}
          combine('/', directories, [plugin.name]),
          // directory {dir}/{prefix}/{format}
          combine('/', directories, combine('/', [plugin.prefix], folderNames)),
          // directory {dir}/{format}/{prefix}
          combine('/', directories, combine('/', folderNames, [plugin.prefix]))
        ]);

        // allow the file.js as well as the file/ directory
        files = combine('', files, ['.js', '']);

        files.forEach((file: string) => {
          if (plugin.loaded) {
            return;
          }

          try {
            const loadedPlugin: any = require(file);
            plugin.loaded = true;
            const key: string = Object.keys(loadedPlugin)[0];
            const [type, name]: string[] = key.split(':');
            this.plugins[type][name] = loadedPlugin[key];
          } catch(e) {
            if (file === '/Users/Ryan/projects/hayjs/hay.js.org/git/node_modules/hay-react-engine') {
              console.log('hello', e);
            }
          }
        });
      });

      const webpackConfig: any = this.values.webpackConfig;
      if (!!webpackConfig) {
        try {
          this.webpackConfig = require(path.resolve(process.cwd(), webpackConfig));
        } catch(e) {
          throw `could not find webpack config at ${webpackConfig}`;
        }
      }

      resolve();
    });
  }

  private async loadFile(filename: string): Promise<any> {
    return new Promise(async (resolve) => {
      let loaders: ConfigLoaders = {
        async yml(filename) {
          return new Promise((resolve) => {
            let result: any;
            try {
              fs.readFile(path.resolve(process.cwd(), filename), (err: any, contents: Buffer) => {
                try {
                  result = yaml.safeLoad(contents.toString());
                } catch (e) {
                  resolve();
                }
                resolve(result);
              });
            } catch (e) {
              resolve();
            }
          });
        },
        async js(filename) {
          return new Promise((resolve) => {
            let result: any;
            try {
              result = require(path.join(process.cwd(), `./${filename}`));
              resolve(result);
            } catch (e) {
              resolve();
            }
          });
        },
        async json(filename) {
          return this.js(filename);
        }
      };

      let ext = 'js';
      let result = loaders[ext] && loaders[ext](filename);

      if (result) {
        return resolve(result);
      }
      resolve();
    });
  }
}

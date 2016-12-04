import { Config } from './config';
import { FileSystem } from './files/file-system';
import { Reporter } from './reporter';

import { invariant } from './invariant';
import { HayCommand, HayCommandInstance } from './cli';

import { MarkedTemplateParser } from './parser/marked';

import {
  EngineConstructor,
  TemplateEngine,
  ParserConstructor,
  TemplateParser
} from './template';

export interface HayFileSystem {
  copy: (...args: any[]) => Promise<any>;
  getFileExtension: (file: string) => string;
  mkDir: (...args: any[]) => Promise<any>;
  readDir: (...args: any[]) => Promise<any>;
  readFile: (...args: any[]) => Promise<any>;
  removeExtension: (file: string) => string;
  unlink: (...args: any[]) => Promise<any>;
  writeFile: (...args: any[]) => Promise<any>;
}

export class Hay {
  public config: Config;
  public engine: TemplateEngine;
  public fileSystem: HayFileSystem = new FileSystem();
  public parsers: TemplateParser[] = [];
  public reporter: Reporter;
  public server: any;
  public startTime: number;

  constructor(private args: any) {
    this.config = new Config();
    this.reporter = new Reporter({ suppressLevel: this.config.values.suppressLevel });

    this.config.plugins.parser['marked'] = MarkedTemplateParser;

    this.config.setReporter(this.reporter);
  }

  public async run(command: HayCommand, startTime: number): Promise<any> {
    this.setTemplateEngine(this.config.values.engine);
    this.setTemplateParsers(this.config.values.parsers);

    this.startTime = startTime;
    this.config.resolvePaths();
    this.config.logInfo(this.reporter.log);

    let commandInstance: HayCommandInstance = new command(this);

    if (this.args.watch && commandInstance.watch)  {
      return await commandInstance.watch();
    }
    return await commandInstance.run();
  }

  public setTemplateEngine(engine: string) {
    invariant(
      this.config.plugins.engine[engine],
      `cannot find template engine ${engine}`
    );

    let engineConstructor: EngineConstructor = <any> this.config.plugins.engine[engine];

    this.engine = new engineConstructor(this);
  }

  public setTemplateParsers(parsers: string[]) {
    parsers.forEach((parser: string) => {
      invariant(
        this.config.plugins.parser[parser],
        `cannot find template parser ${parser}`
      );

      let parserConstructor: ParserConstructor = <any> this.config.plugins.parser[parser];

      this.parsers.push(new parserConstructor(this));
    });
  }
}

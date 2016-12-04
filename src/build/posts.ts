import * as path from 'path';

import * as chokidar from 'chokidar';
import { FSWatcher } from 'fs';

import { BaseBuilder } from './base';
import { File, FileInfo } from '../template';
import { Hay } from '../hay';

const FILENAME_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})-([-\w]+?)\.(\w+)?$/i;

const POST_REGISTRY: Map<string, string> = new Map<string, string>();

export class PostBuilder extends BaseBuilder {
  public template: string;

  constructor(hay: Hay) {
    super(hay);

    super.setConfig({
      name: 'post',
      directory: hay.config.values.postsDir,
      fileExtensions: hay.config.values.postExtensions
    });
  }

  public async parseFile(file: File): Promise<any> {
    let info: FileInfo = await this.hay.engine.extractInfo(file);

    let match = FILENAME_DATE_REGEX.exec(file.fileName);
    if (match) {
      info.date = new Date(match.slice(1, 4).join('-'));

      if (this.hay.config.values.autoPermalink) {
        info.output.directory = match[4];
        info.output.fileName = 'index.html';
      }
    } else if (info.options && info.options.date) {
      info.date = new Date(info.options.date);
    }

    let parsed: any = await this.hay.engine.compileTemplate(info);
    let output: string = await parsed.render(info);

    let outputDir: string = path.resolve(this.hay.config.values.destination, info.output.directory);

    POST_REGISTRY.set(file.fileName, path.resolve(outputDir, info.output.fileName));

    await this.hay.fileSystem.mkDir(outputDir);
    await this.hay.fileSystem.writeFile(
      path.resolve(outputDir, info.output.fileName),
      output
    );
  }

  async removeFile(file: File): Promise<any> {
    let shortName: string = path.basename(file.fileName);
  }

  async run(): Promise<any> {
    let files: File[] = await super.loadFiles();

    return Promise.all(files.map(async (file: File) => await this.parseFile(file)));
  }

  public finish() {
    this.hay.reporter.finish(`<green>✓</green>  parsed posts`);
  }

  public async watch() {
    let watcher: FSWatcher = chokidar.watch(this.config.directory, {
      ignored: /[\/\\]\./,
      persistent: true,
      cwd: this.config.directory
    });

    watcher
      .on('add', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }
        await this.addOrChange(changedFile);
        this.hay.reporter.finish(`added ${changedFile}`);
      })
      .on('change', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }
        await this.addOrChange(changedFile);
        this.hay.reporter.finish(`updated ${changedFile}`);
      })
      .on('unlink', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }

        if (POST_REGISTRY.has(changedFile)) {
          let changedFileMapping =  <string>POST_REGISTRY.get(changedFile);

          if (changedFileMapping) {
            const directoryToDelete = path.dirname(changedFileMapping);
            await this.hay.fileSystem.unlink(directoryToDelete);
          }
        }
        this.hay.reporter.finish({ gutter: { styles: ['red'] } })(`removed ${changedFile}`);
      })
      .on('ready', () => {
        this.WATCH_INITIATED = true;
      });
  }

  private async addOrChange(changedFile: string): Promise<void> {
    let contents: string = await this.hay.fileSystem.readFile(
      path.resolve(this.config.directory, changedFile)
    );

    await this.parseFile({
      fileName: changedFile,
      contents
    });
  }
}

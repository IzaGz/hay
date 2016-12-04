import * as path from 'path';
import * as glob from 'glob';
import * as chokidar from 'chokidar';
import { FSWatcher } from 'fs';

import { BaseBuilder } from './base';
import { File, FileInfo, FileParsed } from '../template';
import { Hay, HayFileSystem } from '../hay';
import { ConfigValues } from '../config';

const FILE_REGISTRY: Map<string, string> = new Map<string, string>();

export class CopyBuilder extends BaseBuilder {
  public template: string;

  constructor(hay: Hay) {
    super(hay);

    super.setConfig({
      name: 'file',
      directory: hay.config.values.source,
      fileExtensions: []
    });
  }

  async loadOtherFiles(): Promise<string[]> {
    let config: ConfigValues = this.hay.config.values;

    return new Promise<string[]>((resolve, reject) => {
      new glob.Glob(
        '**/*',
        {
          cwd: config.source,
          nodir: true,
          ignore: [
            config.partialsDir ?
              path.relative(config.source, config.partialsDir) + '/**/*'
              :
              '',
            config.postsDir ?
              path.relative(config.source, config.postsDir) + '/**/*'
              :
              '',
            config.layoutsDir ?
              path.relative(config.source, config.layoutsDir) + '/**/*'
              :
              '',
            ...config.exclude
          ]
        },
        function (err: any, matches: string[]) {
          if (err) reject(err);

          resolve(matches);
        }
      );
    });
  }

  async parseOtherFile(file: string): Promise<any> {
    if (file[0] === '_') {
      return Promise.resolve();
    }
    const config: ConfigValues =  this.hay.config.values;
    const fileSystem: HayFileSystem = this.hay.fileSystem;

    let mdExtensions: string[] = config.markdownExtensions;

    let info: FileInfo = {
      path: path.dirname(path.resolve(config.source, file)),
      fileName: file,
      output: {
        directory: path.dirname(file),
        fileName: path.basename(file)
      },
      shortName: this.hay.fileSystem.removeExtension(file),
      fileExt: this.hay.fileSystem.getFileExtension(file)
    };

    let extensions: string[] = [...config.markdownExtensions];

    if (config.layoutsDir && config.layoutExtensions) {
      extensions = extensions.concat(config.layoutExtensions);
    }
    if (config.partialsDir && config.partialExtensions) {
      extensions = extensions.concat(config.partialExtensions);
    }

    if (extensions.includes(<string>info.fileExt)) {
      let baseName: string = path.basename(file, path.extname(file));
      let contents: string = await this.hay.fileSystem.readFile(path.resolve(config.source, file));

      let parsedHeader: FileParsed = await this.hay.engine.parseFile(contents, file);

      info.contents = parsedHeader.contents;
      info.options = parsedHeader.options;

      if (baseName !== 'index' && parsedHeader.options.permalink) {
        info.output.directory = parsedHeader.options.permalink;
        info.output.fileName = 'index.html';
      }

      let parsed: any = await this.hay.engine.compileTemplate(info);
      let output: string = await parsed.render(info);

      const destinationFolder: string = path.resolve(config.destination, info.output.directory);

      FILE_REGISTRY.set(
        path.resolve(config.source, file),
        path.resolve(destinationFolder, `${fileSystem.removeExtension(info.output.fileName)}.html`)
      );

      await fileSystem.mkDir(destinationFolder);
      await fileSystem.writeFile(
        path.resolve(destinationFolder, `${fileSystem.removeExtension(info.output.fileName)}.html`),
        output
      );
    } else {
      FILE_REGISTRY.set(
        path.resolve(config.source, file),
        path.resolve(config.destination, info.output.directory, info.output.fileName)
      );

      await fileSystem.copy(
        path.resolve(config.source, file),
        path.resolve(config.destination, info.output.directory, info.output.fileName)
      );
    }
  }

  async removeFile(file: File): Promise<any> {
    let shortName: string = path.basename(file.fileName);
  }

  async run(): Promise<any> {
    let files: string[] = await this.loadOtherFiles();

    return Promise.all(files.map(async (file: string) => await this.parseOtherFile(file)));
  }

  public finish() {
    this.hay.reporter.finish(`<green>✓</green>  copied files`);
  }

  public async watch() {
    let config: ConfigValues = this.hay.config.values;

    let watcher: FSWatcher = chokidar.watch(this.config.directory, {
      ignored: [
        /[\/\\]\./,
        config.partialsDir ?
          path.relative(config.source, config.partialsDir) + '/**/*'
          :
          '',
        config.postsDir ?
          path.relative(config.source, config.postsDir) + '/**/*'
          :
          '',
        config.layoutsDir ?
          path.relative(config.source, config.layoutsDir) + '/**/*'
          :
          '',
        ...config.exclude
      ],
      persistent: true,
      cwd: this.config.directory
    });

    watcher
      .on('add', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }
        await this.addOrChange(changedFile);
        this.hay.reporter.success(`copy: added ${changedFile}`);
      })
      .on('change', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }
        await this.addOrChange(changedFile);
        this.hay.reporter.success(`copy: updated ${changedFile}`);
      })
      .on('unlink', async (changedFile: string) => {
        if (!this.WATCH_INITIATED) {
          return;
        }

        if (FILE_REGISTRY.has(changedFile)) {
          let changedFileMapping =  <string>FILE_REGISTRY.get(changedFile);

          if (changedFileMapping) {
            const directoryToDelete = path.dirname(changedFileMapping);
            await this.hay.fileSystem.unlink(directoryToDelete);
          }
        }
        this.hay.reporter.success({ gutter: { styles: ['red'] } })(`removed ${changedFile}`);
      })
      .on('ready', () => {
        this.WATCH_INITIATED = true;
      });
  }

  private async addOrChange(changedFile: string): Promise<void> {
    await this.parseOtherFile(changedFile);
  }
}

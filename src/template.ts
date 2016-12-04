import { Hay } from './hay';
import * as yaml from 'js-yaml';
import { ConfigValues } from './config';

const TEMPLATE_HEADER = /^(?:\/\*)?(?:[\n]?---\n)([\s\S]*?)(?:\n[\s]*?---[\n]?)(?:\*\/)?/;

export interface File {
  path?: string;
  contents: string;
  fileName: string;
  namespace?: string;
}

export interface FileInfo {
  path?: string;
  options?: FileOptions;
  contents?: string;
  fileName?: string;
  original?: {
    contents?: string;
  },
  date?: Date,
  permalink?: string;
  output: {
    directory: string;
    fileName: string;
  };
  namespace?: string;
  noCompile?: boolean;
  shortName?: string;
  fileExt?: string;
}

export interface FileParsed {
  options: FileOptions;
  contents: string;
}

export interface FileOptions {
  layout?: string;
  title?: string;
  date?: string;
  permalink?: string;
  fileName?: string;
  [x: string]: any;
};

export abstract class TemplateEngine {
  constructor(public hay: Hay) {

  }

  public async extractInfo(file: File): Promise<FileInfo> {
    let parsedHeader: FileParsed = await this.parseFile(file.contents, file.fileName);

    let info: FileInfo = {
      path: file.path,
      options: parsedHeader.options,
      contents: parsedHeader.contents,
      fileName: file.fileName,
      original: {
        contents: file.contents
      },
      output: {
        directory: '',
        fileName: ''
      },
      fileExt: this.hay.fileSystem.getFileExtension(file.fileName),
      shortName: this.hay.fileSystem.removeExtension(file.fileName),
      namespace: file.namespace || ''
    };

    let config: ConfigValues = this.hay.config.values;

    let noExt: string = this.hay.fileSystem.removeExtension(file.fileName);
    if (config.autoPermalink) {
      info.output.directory = noExt;
      info.output.fileName = 'index.html';
    } else {
      info.output.directory = '';
      info.output.fileName = `${noExt}.html`;
    }

    return info;
  }

  public abstract async compileTemplate(info: FileInfo): Promise<any>;

  public async parseFile(contents: string, fileName: string): Promise<FileParsed> {
    let header = TEMPLATE_HEADER.exec(contents);

    let options: FileOptions = {
      fileName: fileName
    };
    if (header) {
      try {
        options = this.parseOptions(header[1]);
      } catch(e) {
        throw `${e} ${fileName}`;
      }
      contents = contents.replace(header[0], '');
    }

    let file: FileParsed = { options, contents };

    return file;
  }

  private parseOptions(options: string): FileOptions {
    if (!options) {
      return {

      };
    }

    let parsedOptions: FileOptions;
    try {
      parsedOptions = JSON.parse(options);
    } catch(e) {
      try {
        parsedOptions = yaml.safeLoad(options, {
          schema: yaml.JSON_SCHEMA
        });
      } catch(e) {
        throw `cannot parse header`;
      }
    }

    return parsedOptions;
  }

}

export interface EngineConstructor {
  new (hay: Hay): TemplateEngine;
}


export abstract class TemplateParser {
  constructor(public hay: Hay) {

  }

  public abstract async run(file: FileInfo): Promise<FileInfo>;
}

export interface ParserConstructor {
  new (hay: Hay): TemplateParser;
}

import * as path from 'path';
import * as minimatch from 'minimatch';

import { FileSystem } from './file-system';
import { HayFileSystem } from '../hay';

export interface Folder {
  [x: string]: Folder | string;
}

const fs: Folder = {};

export function find(directory: string): Folder | string {
  const split: string[] = directory.split(path.sep);

  return split.reduce((currentDir: Folder, name: string) => {
    if (!currentDir || typeof currentDir !== 'object' || !name) {
      return currentDir;
    }
    return currentDir[name];
  }, fs);
}

function folderToArray(folder: Folder, cwd?: string): string[] {
  let paths: string[] = [];

  for (let i in folder) {
    if (typeof folder[i] === 'object') {
      paths = paths.concat(
        folderToArray(<Folder> folder[i], i)
          .map((fileName) => [cwd, fileName].join(path.sep))
      );

      continue;
    }

    paths = paths.concat([[cwd, i].join(path.sep)]);
  }

  return paths;
}

export class MemoryFileSystem implements HayFileSystem {
  public find: typeof find = find;
  public fs = fs;

  private hayFs = new FileSystem();

  public async copy(source: string, dest: string): Promise<void> {
    await this.mkDir(path.dirname(dest));

    let from: string = await this.hayFs.readFile(source);

    const to: Folder = <Folder> find(path.dirname(dest));
    const filename: string = path.basename(source);

    to[filename] = from;
  }

  public async mkDir(directory: string): Promise<void> {
    const split: string[] = directory.split(path.sep);

    split.reduce((currentDir: Folder, name: string) => {
      if (!name) {
        return currentDir;
      }

      if (!currentDir[name]) {
        currentDir[name] = {};
      }
      return currentDir[name];
    }, fs);

    return Promise.resolve();
  }

  public getFileExtension(file: string): string {
    return path.extname(file).slice(1);
  }

  public async readDir(directory: string): Promise<string[]> {
    let folder: Folder = <Folder> find(directory);

    if (!folder) {
      return this.hayFs.readDir(directory);
    }

    return Promise.resolve(Object.keys(folder));
  }

  public async readFile(file: string): Promise<any> {
    let contents: string = <string> find(file);

    if (typeof contents !== 'string') {
      let actualFile = await this.hayFs.readFile(file);

      return actualFile;
    }

    return contents.replace(/\r\n/g, '\n');
  }

  public removeExtension(fileName: string): string {
    return <string> fileName.split('.').slice(0, -1).join('.');
  }

  public async unlink(fileName: string): Promise<void> {
    const folder = <Folder> find(path.dirname(fileName));

    const file = path.relative(path.dirname(fileName), fileName);

    delete folder[file];

    return Promise.resolve();
  }

  public async writeFile(fileName: string, contents: string): Promise<void> {
    await this.mkDir(path.dirname(fileName));

    let folder: Folder = <Folder> find(path.dirname(fileName));

    folder[path.basename(fileName)] = contents;

    return Promise.resolve();
  }
}

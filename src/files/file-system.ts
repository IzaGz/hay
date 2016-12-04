import * as fs from 'fs';
import * as glob from 'glob';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { HayFileSystem } from '../hay';

export type ConvertedPromise = (...args: any[]) => Promise<any>;

export class FileSystem implements HayFileSystem {
  public mkDir: ConvertedPromise = this.convertToPromise(mkdirp);
  public readDir: ConvertedPromise = this.convertToPromise(fs.readdir);
  public unlink: ConvertedPromise = this.convertToPromise(rimraf);
  public writeFile: ConvertedPromise = this.convertToPromise(fs.writeFile);

  public async copy(source: string, dest: string): Promise<void> {
    await this.mkDir(path.dirname(dest));

    return new Promise<void>(async (resolve, reject): Promise<void> => {
      const readStream = fs.createReadStream(source);
      const writeStream = fs.createWriteStream(dest);

      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('open', ()  => readStream.pipe(writeStream));
      writeStream.on('close', resolve);
    });
  }

  public getFileExtension(file: string): string {
    return path.extname(file).slice(1);
  }

  public async readFile(file: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(file, 'binary', (err, content) => {
        if (err) {
          return reject(err);
        }
        resolve(content.toString());
      });
    });
  }

  public removeExtension(fileName: string): string {
    return <string> fileName.split('.').slice(0, -1).join('.');
  }

  private convertToPromise(fn: Function): ConvertedPromise {
    return (...args: any[]) => new Promise((resolve, reject) => {
      args.push((err: any, ...res: any[]) => {
        res = res.length < 2 ? res[0] : res;

        if (err) {
          return reject(err);
        }
        resolve(res);
      });

      fn(...args);
    });
  }
}

import * as commander from 'commander';

import { BaseCommand } from './base';

import { Hay } from '../hay';

import { LayoutsBuilder } from '../build/layouts';
import { PartialsBuilder } from '../build/partials';
import { PostBuilder } from '../build/posts';
import { CopyBuilder } from '../build/copy';
import { BaseBuilder } from '../build/base';


export class BaleCommand extends BaseCommand {
  private layoutsBuilder: LayoutsBuilder;
  private partialsBuilder: PartialsBuilder;
  private postBuilder: PostBuilder;
  private copyBuilder: CopyBuilder;

  constructor(hay: Hay) {
    super(hay);

    this.layoutsBuilder = new LayoutsBuilder(this.hay);
    this.partialsBuilder = new PartialsBuilder(this.hay);
    this.postBuilder = new PostBuilder(this.hay);
    this.copyBuilder = new CopyBuilder(this.hay);
  }

  static destroy(commander: commander.ICommand) {

  }

  static options(commander: commander.ICommand) {
    commander.usage('bale [flags]');
    commander.option('--watch', 'watch for changes');
  }

  public async run() {
    this.hay.reporter.info('starting build');

    const { destination } = this.hay.config.values;
    await this.hay.fileSystem.mkDir(destination);
    await this.hay.fileSystem.unlink(destination);

    await super.queue(this.getBuilders());

    let time: string = ((Date.now() - this.hay.startTime) / 1000).toFixed(2);
    this.hay.reporter.info(`build took ${time}s\n`);
  }

  public finish() {
    this.hay.reporter.finish(`<green>✓</green>  finished posts`);
  }

  public async watch(): Promise<void> {
    await this.run();

    this.hay.reporter.info('watching for changes..');

    await super.watch(this.getBuilders());
  }

  private getBuilders(): BaseBuilder[] {
    let builders: BaseBuilder[] = [];

    if (this.hay.config.values.partialsDir) {
      builders.push(this.partialsBuilder);
    }
    if (this.hay.config.values.layoutsDir) {
      builders.push(this.layoutsBuilder);
    }
    if (this.hay.config.values.postsDir) {
      builders.push(this.postBuilder);
    }

    builders.push(this.copyBuilder);

    return builders;
  }
}


// export async function run(config: HayConfig, reporter: Console, program: Program): Promise<any> {
//   await fs.unlink(config.destination);
//   await fs.unlink(config.destination); && mkdirp(config.destination);
//
//   if (program.watch) {
//     reporter.info('running normal build first\n');
//   }
//   await layouts(4, config, reporter, program);
//   await includes(4, config, reporter, program);
//   await posts(4, config, reporter, program);
//   await copy(4, config, reporter, program);
//
//   reset();
//
//   let time = ((Date.now() - program.startTime) / 1000).toFixed(2);
//   reporter.info(`build took ${time}s\n`);
//
//   if (program.watch) {
//     return watch(config, reporter, program)
//       .catch(err => {
//         console.log('handle error a', err);
//       });
//   }
// }

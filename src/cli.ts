import * as commander from 'commander';
import { Hay } from './hay';
import { commands, aliases } from './commands/index';
const pkgInfo = require('../package.json');

let startTime: number = Date.now();

export interface HayCommandInstance {
  run(): Promise<any>;
  watch?(): Promise<void>;
}

export interface HayCommand {
  new (hay: Hay): HayCommandInstance;
  options?: Function;
}

let [node, hayCmd, name, ...endArgs] = process.argv;

let dividerIndex = endArgs.indexOf('--');
let args: string[] = endArgs.splice(0, dividerIndex === -1 ? endArgs.length : dividerIndex);

if (dividerIndex > -1) {
  endArgs.shift();
}

commander.version(pkgInfo.version);
commander.usage('[command] [flags]');
commander.option('--config <file>', 'config file');
commander.option('--destination <dir>', 'output directory');
commander.option('--no-progress', 'removes progress bar from output');
commander.option('--posts-dir <dir>', 'posts directory');
commander.option('--quiet', ' only show errors in console');
commander.option('--source <dir>', 'source directory to build from');

let commandName = '';

let helpCommands = ['help', '--help', '-h'];
if (helpCommands.includes(name)) {
  name = 'help';

  if (args.length) {
    commander.on('--help', () => {
      console.log(`hello ${name}`);
    });
  } else {
    commander.on('--help', () => {
      console.log(`hi`);
    });
  }

  name = <string>args.shift();
  args.push('--help');
}

commandName = aliases[name] || name || 'bale';

let command: HayCommand = commands[commandName];
(command && command.options) && command.options(commander);

if (commandName === 'help' || args.includes('--help') || args.includes('-h')) {
  commander.parse([node, hayCmd, commandName].concat(args));
  commander.help();
  process.exit(1);
}

commander.parse([node, hayCmd, commandName].concat(args));

if (!command) {
  class NoCommand {
    async run() {
      return Promise.reject(`Command ${commandName} not found`);
    }
  }

  command = NoCommand;
}

let hay: Hay = new Hay(commander.args.concat(endArgs));

if (command && commandName !== name && name) {
  hay.reporter.log(`<dim>Using ${commandName} (alias ${name} => ${commandName})</dim>`);
}

hay.reporter.log(`<bold>${pkgInfo.name} ${commandName} v${pkgInfo.version}</bold>`);

hay
  .config
  .loadConfig(commander)
  .then(() => hay.run(command, startTime))
  .catch((err: any) => console.error(err));

# Contributing to hay

All contributions to hay is greatly appreciated.

Please make sure that any contribution you make has an issue for it, and that you link to the issue in your pull request. Before the pull request is merged the issue must have an approved label on it (this will be added if it's an approved feature/fix etc and needs to be done).

# Submitting an issue

When you submit an issue, please keep to the pre-filled template, as it will help speed things along when your issue is addressed.

# Make a change

To setup hay for development, run the following -

```bash
git clone git@github.com:hayjs/hay.git
cd hay
yarn install
yarn start
```

This will start watching for changes to any source files, and compile/bundle the source.

If you're running hay from the CLI and want to test your changes, it's important that you remove the global installation of hay and replace it with your development version - 

```
npm uninstall -g hay
cd dist/
npm link -g
```

(using `npm link` here as I've found it works better than `yarn link`)

## Committing and adding a PR

Once you're ready, commit your changes and submit your PR. All commits should follow [these guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit) (to keep things neat).

Your PR should keep to the pre-filled template.

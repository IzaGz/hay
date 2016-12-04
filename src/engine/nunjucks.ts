import * as nunjucks from 'nunjucks';

import { Hay } from '../hay';
import { TemplateEngine, FileInfo } from '../template';
import { invariant } from '../invariant';

const CACHE: Map<string, NunjucksTemplate> = new Map<string, NunjucksTemplate>();

class NunjucksLoader {
  getSource(name: string): nunjucks.LoaderSource {
    invariant(
      CACHE.has(name),
      `could not find template ${name}`
    );

    let template: NunjucksTemplate = <NunjucksTemplate> CACHE.get(name);

    if (!template || !template.info.contents) {
      throw `could not find template for ${name}`;
    }

    return {
      src: template.info.contents,
      path: name,
      noCache: true
    }
  }
}

export class NunjucksTemplate {
  public template: nunjucks.Template;

  constructor(public info: FileInfo,
              private env: nunjucks.Environment) {
    CACHE.set(info.namespace + info.shortName, this);
    CACHE.set(info.namespace + info.fileName, this);

    if (info.contents) {
      this.template = nunjucks.compile(info.contents, env);
    }
  }

  public async render(data: any): Promise<string> {
    let compiledTemplate: string = this.template.render(data);

    if (this.info.options && this.info.options.layout) {
      let parentTemplateName: string = this.info.options.layout;
      let parentFileName: string = 'layouts:' + parentTemplateName;

      invariant(
        CACHE.has(parentFileName),
        `cannot find layout for ${this.info.fileName}`
      );

      let parentTemplate: NunjucksTemplate = <NunjucksTemplate> CACHE.get(parentFileName);

      return await parentTemplate.render(Object.assign({}, data, {
        page: data.page || this.info.options,
        content: compiledTemplate
      }));
    }

    return compiledTemplate;
  }
}

export class NunjucksTemplateEngine extends TemplateEngine {
  private env: nunjucks.Environment;

  constructor(hay: Hay) {
    super(hay);

    this.env = new nunjucks.Environment(new NunjucksLoader(), { autoescape: false });
  }

  public async compileTemplate(info: FileInfo): Promise<NunjucksTemplate> {
    return new NunjucksTemplate(info, this.env);
  }
}

Hay.registerTemplateEngine('nunjucks', NunjucksTemplateEngine);

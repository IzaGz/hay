import * as liquid from 'liquid-node';

import { Hay } from '../hay';
import { TemplateEngine, FileInfo } from '../template';
import { invariant } from '../invariant';

const engine: liquid.Engine = new liquid.Engine();
const CACHE: Map<string, LiquidTemplate> = new Map<string, LiquidTemplate>();

export class LiquidTemplate {
  public template: Promise<liquid.Template>;

  constructor(public info: FileInfo) {
    CACHE.set(info.namespace + info.shortName, this);
    CACHE.set(info.namespace + info.fileName, this);

    if (info.contents) {
      this.template = engine.parse(info.contents);
    }
  }

  public async render(data: any): Promise<string> {
    const template: liquid.Template = await this.template;
    let compiledTemplate: string = await template.render(data);

    if (this.info.options && this.info.options.layout) {
      let parentTemplateName: string = this.info.options.layout;
      let parentFileName: string = 'layouts:' + parentTemplateName;

      invariant(
        CACHE.has(parentFileName),
        `cannot find layout for ${this.info.fileName}`
      );

      let parentTemplate: LiquidTemplate = <LiquidTemplate> CACHE.get(parentFileName);

      return await parentTemplate.render(Object.assign({}, data, {
        page: data.page || this.info.options,
        content: compiledTemplate
      }));
    }

    return compiledTemplate;
  }
}

export class LiquidTemplateEngine extends TemplateEngine {
  constructor(hay: Hay) {
    super(hay);
  }

  public async compileTemplate(info: FileInfo): Promise<LiquidTemplate> {
    return new LiquidTemplate(info);
  }
}

Hay.registerTemplateEngine('liquid', LiquidTemplateEngine);

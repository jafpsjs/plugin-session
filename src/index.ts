import fp from "fastify-plugin";
import type {} from "fastify";


export type TemplatePluginOptions = {
  value: string;
};

export const name = "@jafps/plugin-template";

export default fp<TemplatePluginOptions>(
  async (app, opts) => {
    const { value } = opts;
    app.decorate("hello", () => value);
  },
  {
    decorators: {},
    dependencies: [],
    fastify: "5.x",
    name
  }
);

declare module "fastify" {
  interface FastifyInstance {
    readonly hello: () => string;
  }
}

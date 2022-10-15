import type { FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { News } from "../../report";

interface FetchOptions {
  resource: string;
  interval?: number;
  gotOptions: any;
  newsify(resp: any): News[];
}

declare module "fastify" {
  interface FastifyInstance {
    intervalFetch(opts: FetchOptions): Promise<any>;
  }
}

export default fp(
  async function (fastify, opts) {
    const got = await import("got").then((module) => module.default);
    fastify.decorate("intervalFetch", async function <
      T
    >({ resource, gotOptions, interval = 60 * 1000, newsify }: FetchOptions) {
      let lastTimestamp = new Date(0);

      const watchFunction = async () => {
        try {
          const resp: T = await got(resource, gotOptions).json();

          const newsList = newsify(resp).sort(
            (newsA, newsB) =>
              +new Date(newsA.timestamp).getTime() -
              +new Date(newsB.timestamp).getTime()
          );

          await Promise.all(
            newsList.map(async (news) => {
              if (news.timestamp <= lastTimestamp) return;
              lastTimestamp = news.timestamp;

              return await fastify.report(news);
            })
          );
        } catch (err) {
          console.error(err);
        }

        setTimeout(() => watchFunction, interval);
      };

      await watchFunction();
    });
    console.log("[@plugin/interval-fetch] interval-fetch registered");
  },
  {
    name: "interval-fetch",
    dependencies: ["report"],
  }
);

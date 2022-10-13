import fp from "fastify-plugin";
import type { News } from "../report/index";

const NewsSources = ["", "Twitter", "Weibo", "Unofficial@Twitter"] as const;

type NewsListQuery = {
  p: number;
  source: typeof NewsSources[number];
};

declare module "fastify" {
  interface FastifyInstance {
    getNews: (query: NewsListQuery) => Promise<News[]>;
    invalidateNews: () => void;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<News>("news");
    const NEWS_PER_PAGE = 10;

    const cachedNews: Map<NewsListQuery, News[]> = new Map();

    fastify.decorate("getNews", async function (query: NewsListQuery) {
      if (cachedNews.has(query)) {
        return cachedNews.get(query) ?? [];
      }

      const { p, source } = query;
      const queryResult = await collection
        ?.find({
          source: {
            $regex: `^${source}`,
          },
        })
        .sort({ timestamp: -1 })
        .skip(p * NEWS_PER_PAGE)
        .limit(NEWS_PER_PAGE)
        .toArray();

      cachedNews.set(query, queryResult ?? []);

      return queryResult ?? [];
    });

    fastify.decorate("invalidateNews", function () {
      cachedNews.clear();
    });

    console.log("[@plugin/news] news plugin registered");
  },
  {
    name: "news",
    dependencies: ["mongodb"],
  }
);

export { NewsSources };
export type { NewsListQuery };

import type { FastifyInstance } from "fastify";

interface INewsListQuery {
  p: number;
  source: "all" | "Twitter" | "Weibo";
}

export default async function (fastify: FastifyInstance) {
  const collection = fastify.mongo.db?.collection("news");
  const NEWS_PER_PAGE = 10;

  fastify.get<{ Querystring: INewsListQuery }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { p, source } = request.query;
        if (p < 0 || Number.isInteger(p)) {
          done(new Error("Invalid page number"));
        }

        if (source !== "all" && source !== "Twitter" && source !== "Weibo") {
          done(new Error("Invalid news source"));
        }

        done(undefined);
      },
    },
    async function (request) {
      const { p, source } = request.query;

      const newsArray = await collection
        ?.find({
          source: {
            $regex: `^${source}`,
          },
        })
        .sort({ timestamp: -1 })
        .skip(p * NEWS_PER_PAGE)
        .limit(NEWS_PER_PAGE)
        .toArray();

      return newsArray;
    }
  );
}

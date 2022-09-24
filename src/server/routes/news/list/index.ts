import type { FastifyInstance } from "fastify";

interface INewsListQuery {
  p: number;
}

export default async function (fastify: FastifyInstance) {
  const collection = fastify.mongo.db?.collection("news");
  const NEWS_PER_PAGE = 20;

  fastify.get<{ Querystring: INewsListQuery }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { p } = request.query;
        if (p < 0 || Number.isInteger(p)) {
          done(new Error("Invalid page number"));
        }
        done(undefined);
      },
    },
    async function (request) {
      const { p } = request.query;
      const newsArray = await collection
        ?.find()
        .sort({ _id: -1 })
        .skip(p * NEWS_PER_PAGE)
        .limit(NEWS_PER_PAGE)
        .toArray();

      return newsArray;
    }
  );
}

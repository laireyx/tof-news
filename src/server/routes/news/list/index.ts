import type { FastifyInstance } from "fastify";
import { NewsListQuery, NewsSources } from "../../../plugins/news/index";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: NewsListQuery }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { p, source } = request.query;
        if (p < 0 || Number.isInteger(p)) {
          done(new Error("Invalid page number"));
        }

        if (!NewsSources.includes(source)) {
          done(new Error("Invalid news source"));
        }

        done(undefined);
      },
    },
    async function (request) {
      return await fastify.getNews(request.query);
    }
  );
}

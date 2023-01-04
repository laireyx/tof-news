import type { FastifyInstance } from "fastify";
import { RefreshQuery } from "../../tof/params";
import { env } from "node:process";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: RefreshQuery }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { token } = request.query;

        if (token !== env.ADMIN_TOKEN) done(new Error("Invalid token"));

        done(undefined);
      },
    },
    function (request) {
      return fastify.tofRefresh(request.query.server);
    }
  );
}

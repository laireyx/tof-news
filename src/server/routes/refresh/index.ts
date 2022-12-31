import type { FastifyInstance } from "fastify";
import { RefreshParams } from "../../tof/params";
import { env } from "node:process";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: RefreshParams }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { token } = request.query;

        if (token !== env.ADMIN_TOKEN) done(new Error("Invalid token"));

        done(undefined);
      },
    },
    function () {
      return fastify.tofRefresh();
    }
  );
}
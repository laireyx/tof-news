import type { FastifyInstance } from "fastify";
import { LookupByNameParams, LookupByNameQuery } from "../../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: LookupByNameParams; Querystring: LookupByNameQuery }>(
    "/:name",
    {
      preValidation: (request, reply, done) => {
        const { name } = request.params;
        if (name.length > 255) {
          done(new Error("Invalid Name"));
        }

        done(undefined);
      },
    },
    function (request) {
      return fastify.tofLookupByName(request.params.name, request.query.server);
    }
  );
}

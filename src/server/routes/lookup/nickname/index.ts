import type { FastifyInstance } from "fastify";
import { LookupByNameParams } from "../../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: LookupByNameParams }>(
    "/:nickname",
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
      return fastify.tofLookupByName(request.params.name);
    }
  );
}

import type { FastifyInstance } from "fastify";
import { LookupParams } from "../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: LookupParams }>(
    "/",
    {
      preValidation: (request, reply, done) => {
        const { uid } = request.query;
        if (uid.length !== 17) {
          done(new Error("Invalid UID"));
        } else if (uid.match(/[^\d]/)) {
          done(new Error("Invalid UID"));
        }

        done(undefined);
      },
    },
    async function (request) {
      fastify.tofLookup(request.query.uid);
      return 0;
    }
  );
}

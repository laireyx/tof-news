import type { FastifyInstance } from "fastify";
import { LookupByUidParams, LookupByUidQuery } from "../../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: LookupByUidParams; Querystring: LookupByUidQuery }>(
    "/:uid",
    {
      preValidation: (request, reply, done) => {
        const { uid } = request.params;
        if (uid.length !== 17) {
          done(new Error("Invalid UID"));
        } else if (uid.match(/[^\d]/)) {
          done(new Error("Invalid UID"));
        }

        done(undefined);
      },
    },
    function (request) {
      return fastify.tofLookupByUid(request.params.uid, request.query.server);
    }
  );
}

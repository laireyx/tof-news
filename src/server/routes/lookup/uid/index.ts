import type { FastifyInstance } from "fastify";
import { LookupByUidParams } from "../../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: LookupByUidParams }>(
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
      return fastify.tofLookupByUid(request.params.uid);
    }
  );
}

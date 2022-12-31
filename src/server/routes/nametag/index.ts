import type { FastifyInstance } from "fastify";
import { NametagParams } from "../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: NametagParams }>(
    "/:uid",
    {
      preValidation: (request, reply, done) => {
        const { uid } = request.params;
        if (!uid.match(/[^\d]+(\.png)?/)) {
          done(new Error("Invalid UID"));
        }

        done(undefined);
      },
    },
    async function (request, reply) {
      const nametag = await fastify.tofNametag(
        request.params.uid.replace(/\.png/, "")
      );
      reply.header("Cache-Control", `max-age=${nametag.maxAge}`);
      reply.type("image/svg+xml");

      return nametag.svg;
    }
  );
}

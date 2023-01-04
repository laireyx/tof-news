import type { FastifyInstance } from "fastify";
import { ScanParams, ScanQuery } from "../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Params: ScanParams; Querystring: ScanQuery }>(
    "/:name",
    function (request) {
      return fastify.tofScan(request.params.name, request.query.server);
    }
  );
}

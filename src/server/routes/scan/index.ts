import type { FastifyInstance } from "fastify";
import { ScanParams } from "../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: ScanParams }>("/", function (request) {
    return { queued: false };
    // return fastify.tofScan(request.query.nickname);
  });
}

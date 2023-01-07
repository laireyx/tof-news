import type { FastifyInstance } from "fastify";
import { PlayerStatQuery } from "../../../tof/params";

export default async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: PlayerStatQuery }>("/", function (request) {
    return fastify.tofStatPlayer(request.query.stat);
  });
}

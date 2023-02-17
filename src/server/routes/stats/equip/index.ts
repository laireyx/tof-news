import type { FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance) {
  fastify.get("/", function (request) {
    return fastify.tofStatEquipments();
  });
}

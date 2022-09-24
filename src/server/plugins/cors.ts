import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";

export default fp(async function (fastify, opts) {
  fastify.register(fastifyCors, {
    origin: true,
  });
});

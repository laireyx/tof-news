import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";

export default fp(
  async function (fastify, opts) {
    await fastify.register(fastifyCors, {
      origin: true,
    });
    console.log("[@plugin/cors] @fastify/cors registered");
  },
  {
    name: "cors",
  }
);

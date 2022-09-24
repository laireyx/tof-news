import fp from "fastify-plugin";
import fastifyCompress from "@fastify/compress";

export default fp(
  async function (fastify, opts) {
    await fastify.register(fastifyCompress);
    console.log("[@plugin/compress] @fastify/compress registered");
  },
  {
    name: "compress",
  }
);

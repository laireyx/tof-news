import fp from "fastify-plugin";
import fastifyMongo from "@fastify/mongodb";
import { env } from "node:process";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp(
  async function (fastify, opts) {
    fastify.register(fastifyMongo, {
      url: `mongodb+srv://${env.MONGO_AUTHORITY}`,
    });
  },
  {
    name: "mongodb",
  }
);

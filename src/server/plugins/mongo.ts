import fp from "fastify-plugin";
import fastifyMongo from "@fastify/mongodb";
import { env } from "node:process";

export default fp(
  async function (fastify, opts) {
    await fastify.register(fastifyMongo, {
      url: `mongodb+srv://${env.MONGO_AUTHORITY}/tof-news`,
    });
    console.log("[@plugin/mongodb] @fastify/mongodb registered");
  },
  {
    name: "mongodb",
  }
);

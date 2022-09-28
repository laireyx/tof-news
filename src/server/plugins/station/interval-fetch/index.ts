import fp from "fastify-plugin";
import AutoLoad from "@fastify/autoload";

import path from "node:path";
import intervalFetch from "./interval-fetch";

export default fp(async function (fastify, opts) {
  await fastify.register(intervalFetch);
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, "stations"),
  });
});

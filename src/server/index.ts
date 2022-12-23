import fastify from "fastify";
import AutoLoad from "@fastify/autoload";

import path from "node:path";
import { env } from "node:process";

function start() {
  const server = fastify({ logger: true });

  server.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    ignorePattern: env.BLOCK_PLUGIN ? new RegExp(env.BLOCK_PLUGIN) : undefined,
  });

  server.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    ignorePattern: env.BLOCK_ROUTE ? new RegExp(env.BLOCK_ROUTE) : undefined,
  });

  server.get("/", async () => {
    return { message: "OK" };
  });

  server.listen({ port: +(env.PORT ?? "3000"), host: "0.0.0.0" });

  process.once("SIGTERM", () => {
    server.close();
  });
}

export default start;

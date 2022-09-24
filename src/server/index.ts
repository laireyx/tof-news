import fastify from "fastify";
import AutoLoad from "@fastify/autoload";

import path from "node:path";
import { env } from "node:process";

function start() {
  const server = fastify({ logger: true });

  server.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
  });

  server.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
  });

  server.get("/", async () => {
    return { message: "OK" };
  });

  server.listen({ port: +(env.PORT ?? "3000"), host: "0.0.0.0" });
}

export default start;

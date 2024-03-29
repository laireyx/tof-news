import stations from "./stations.json";

import fp from "fastify-plugin";
import { TwitterApi } from "twitter-api-v2";

import { env } from "node:process";

declare module "fastify" {
  interface FastifyInstance {
    twitterApi: TwitterApi;
  }
}

export default fp(
  async function (fastify, opts) {
    const client = new TwitterApi(env.TWITTER_API_BEARER ?? "");

    // Get and delete old rules if needed
    const existingRules = await client.v2.streamRules();
    if (existingRules.data?.length) {
      await client.v2.updateStreamRules({
        delete: {
          ids: existingRules.data.map(({ id }) => id),
        },
      });
    }

    const usernameRules = stations
      .map((account) => `from:${account.username}`)
      .join(" OR ");

    await client.v2.updateStreamRules({
      add: [{ value: usernameRules }],
    });

    fastify.decorate("twitterApi", client);
    console.log(`[@plugin/twitter] Stream rules loaded: ${usernameRules}`);
  },
  {
    name: "twitter/init-api",
  }
);

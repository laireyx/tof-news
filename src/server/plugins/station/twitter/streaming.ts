import stations from "./stations.json";

import fp from "fastify-plugin";
import { ETwitterStreamEvent } from "twitter-api-v2";
import { News } from "../../report";

export default fp(
  async function (fastify, opts) {
    const stationMap: Map<
      string | undefined,
      { source: string; lang: string }
    > = new Map();

    stations.forEach((station) => {
      stationMap.set(station.username.toLowerCase(), station);
    });

    const stream = await fastify.twitterApi.v2.searchStream({
      expansions: [
        "author_id",
        "attachments.media_keys",
        "attachments.poll_ids",
      ],
      "user.fields": ["name", "username", "profile_image_url"],
      "media.fields": [
        "type",
        "alt_text",
        "preview_image_url",
        "url",
        "variants",
      ],
      "tweet.fields": ["id", "text", "attachments", "created_at"],
    });

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      const authorId = tweet.data.author_id;
      const authorUser = tweet.includes?.users?.find(
        (user) => user.id === authorId
      );

      const { lang = "", source = "Twitter" } =
        stationMap.get(authorUser?.username.toLowerCase()) ?? {};

      const news: News = {
        url: `https://twitter.com/${authorUser?.username}/status/${tweet.data.id}`,
        lang,
        source,
        author: `${authorUser?.name}(@${authorUser?.username})`,
        authorImg: authorUser?.profile_image_url,
        content: tweet.data.text,
        timestamp: new Date(tweet.data.created_at ?? Date.now()),
        media:
          tweet.includes?.media?.map(
            ({ type, url, preview_image_url: previewUrl, variants }) => {
              return {
                type,
                url:
                  // Variants are for video.
                  variants
                    ?.filter(({ content_type }) => content_type === "video/mp4")
                    ?.map(({ url }) => url) ?? url,
                previewUrl,
              };
            }
          ) ?? [],
      };
      fastify.report(news);
    });

    stream.on(ETwitterStreamEvent.Error, async (err) => {
      console.error(err);
      await stream.reconnect();
    });

    await stream.connect({
      autoReconnect: true,
      autoReconnectRetries: 20,
      keepAliveTimeout: Infinity,
    });
    stream.keepAliveTimeoutMs = Infinity;

    console.log("[@plugin/twitter] Stream connected");
  },
  {
    name: "twitter/streaming",
    dependencies: ["twitter/init-api", "report"],
  }
);

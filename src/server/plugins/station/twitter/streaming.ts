import fp from "fastify-plugin";
import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";
import { News } from "../../report";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp(
  async function (fastify, opts) {
    console.log("[@plugin/twitter] Initialize stream...");
    const stream = await fastify.twitterApi.v2.searchStream({
      expansions: [
        "author_id",
        "attachments.media_keys",
        "attachments.poll_ids",
      ],
      autoConnect: true,
      "user.fields": ["name", "username"],
      "media.fields": ["type", "alt_text", "preview_image_url", "url"],
      "tweet.fields": ["id", "text", "attachments", "created_at"],
    });

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      const authorId = tweet.data.author_id;
      const authorUser = tweet.includes?.users?.find(
        (user) => user.id === authorId
      );

      const news: News = {
        source: "Twitter",
        author: `${authorUser?.name}(@${authorUser?.username})`,
        content: tweet.data.text,
        timestamp: new Date(tweet.data.created_at ?? Date.now()),
        media:
          tweet.includes?.media?.map(({ type, url, preview_image_url }) => ({
            type,
            url,
            previewUrl: preview_image_url,
          })) ?? [],
      };
      fastify.report(news);
    });
  },
  {
    name: "twitter/streaming",
    dependencies: ["twitter/init-api"],
  }
);

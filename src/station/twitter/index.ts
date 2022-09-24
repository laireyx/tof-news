import stations from "../../stations/twitter.json";
import client from "./api";
import { ETwitterStreamEvent, TweetV2SingleStreamResult } from "twitter-api-v2";
import report, { News } from "../../report";

class TwitterStation {
  constructor() {}

  private async setRules() {
    console.log("Set Rules...");
    // Get and delete old rules if needed
    const existingRules = await client.v2.streamRules();
    if (existingRules.data?.length) {
      await client.v2.updateStreamRules({
        delete: {
          ids: existingRules.data.map((existingRule) => existingRule.id),
        },
      });
    }

    const usernameRules = stations
      .map((username) => `from:${username}`)
      .join(" OR ");

    return await client.v2.updateStreamRules({
      add: [{ value: usernameRules }],
    });
  }

  private buildNews(tweet: TweetV2SingleStreamResult) {
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

    return news;
  }

  async listen() {
    await this.setRules();

    console.log("Listening...");

    const stream = await client.v2.searchStream({
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
      const news = this.buildNews(tweet);
      report(news);
    });
  }
}

export default TwitterStation;

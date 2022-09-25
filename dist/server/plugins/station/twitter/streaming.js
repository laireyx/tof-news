"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stations_json_1 = __importDefault(require("./stations.json"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const twitter_api_v2_1 = require("twitter-api-v2");
/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    const sourceMap = new Map();
    stations_json_1.default.forEach((station) => {
        sourceMap.set(station.username.toLowerCase(), station.source);
    });
    const stream = await fastify.twitterApi.v2.searchStream({
        expansions: [
            "author_id",
            "attachments.media_keys",
            "attachments.poll_ids",
        ],
        autoConnect: true,
        "user.fields": ["name", "username", "profile_image_url"],
        "media.fields": ["type", "alt_text", "preview_image_url", "url"],
        "tweet.fields": ["id", "text", "attachments", "created_at"],
    });
    stream.on(twitter_api_v2_1.ETwitterStreamEvent.Data, async (tweet) => {
        const authorId = tweet.data.author_id;
        const authorUser = tweet.includes?.users?.find((user) => user.id === authorId);
        const news = {
            url: `https://twitter.com/${authorUser?.username}/status/${tweet.data.id}`,
            source: sourceMap.get(authorUser?.username.toLowerCase() ?? "") ?? "Twitter",
            author: `${authorUser?.name}(@${authorUser?.username})`,
            authorImg: authorUser?.profile_image_url,
            content: tweet.data.text,
            timestamp: new Date(tweet.data.created_at ?? Date.now()),
            media: tweet.includes?.media?.map(({ type, url, preview_image_url }) => ({
                type,
                url,
                previewUrl: preview_image_url,
            })) ?? [],
        };
        fastify.report(news);
    });
    console.log("[@plugin/twitter] Stream connected");
}, {
    name: "twitter/streaming",
    dependencies: ["twitter/init-api"],
});

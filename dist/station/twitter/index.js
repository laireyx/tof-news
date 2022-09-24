"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const twitter_json_1 = __importDefault(require("../../stations/twitter.json"));
const api_1 = __importDefault(require("./api"));
const twitter_api_v2_1 = require("twitter-api-v2");
const report_1 = __importDefault(require("../../report"));
class TwitterStation {
    constructor() { }
    async setRules() {
        console.log("Set Rules...");
        // Get and delete old rules if needed
        const existingRules = await api_1.default.v2.streamRules();
        if (existingRules.data?.length) {
            await api_1.default.v2.updateStreamRules({
                delete: {
                    ids: existingRules.data.map((existingRule) => existingRule.id),
                },
            });
        }
        const usernameRules = twitter_json_1.default
            .map((username) => `from:${username}`)
            .join(" OR ");
        return await api_1.default.v2.updateStreamRules({
            add: [{ value: usernameRules }],
        });
    }
    buildNews(tweet) {
        const authorId = tweet.data.author_id;
        const authorUser = tweet.includes?.users?.find((user) => user.id === authorId);
        const news = {
            source: "Twitter",
            author: `${authorUser?.name}(@${authorUser?.username})`,
            content: tweet.data.text,
            timestamp: new Date(tweet.data.created_at ?? Date.now()),
            media: tweet.includes?.media?.map(({ type, url, preview_image_url }) => ({
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
        const stream = await api_1.default.v2.searchStream({
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
        stream.on(twitter_api_v2_1.ETwitterStreamEvent.Data, async (tweet) => {
            const news = this.buildNews(tweet);
            (0, report_1.default)(news);
        });
    }
}
exports.default = TwitterStation;

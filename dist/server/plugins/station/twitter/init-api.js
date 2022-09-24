"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stations_json_1 = __importDefault(require("./stations.json"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const twitter_api_v2_1 = require("twitter-api-v2");
const node_process_1 = require("node:process");
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    const client = new twitter_api_v2_1.TwitterApi(node_process_1.env.TWITTER_API_BEARER ?? "");
    console.log("[@plugin/twitter] Initialize stream rules...");
    // Get and delete old rules if needed
    const existingRules = await client.v2.streamRules();
    if (existingRules.data?.length) {
        await client.v2.updateStreamRules({
            delete: {
                ids: existingRules.data.map((existingRule) => existingRule.id),
            },
        });
    }
    const usernameRules = stations_json_1.default
        .map((username) => `from:${username}`)
        .join(" OR ");
    await client.v2.updateStreamRules({
        add: [{ value: usernameRules }],
    });
    fastify.decorate("twitterApi", client);
}, {
    name: "twitter/init-api",
});

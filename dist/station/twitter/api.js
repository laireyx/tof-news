"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twitter_api_v2_1 = require("twitter-api-v2");
const node_process_1 = require("node:process");
const client = new twitter_api_v2_1.TwitterApi(node_process_1.env.TWITTER_API_BEARER ?? "");
exports.default = client;

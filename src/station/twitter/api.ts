import { TwitterApi } from "twitter-api-v2";
import { env } from "node:process";

const client = new TwitterApi(env.TWITTER_API_BEARER ?? "");

export default client;

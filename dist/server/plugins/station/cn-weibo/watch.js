"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const node_process_1 = require("node:process");
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    const got = await import("got").then((module) => module.default);
    const FETCH_INTERVAL = 60 * 1000;
    const newsBoardUrl = "https://weibo.com/ajax/statuses/mymblog?uid=7455256856";
    const watch = async () => {
        const result = await got
            .get(newsBoardUrl, {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng," +
                    "*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "cache-control": "max-age=0",
                dnt: "1",
                cookie: node_process_1.env.WEIBO_COOKIE,
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/101.0.4951.54 Safari/537.36",
            },
            followRedirect: true,
        })
            .json();
        await Promise.all(result.data.list.map(async ({ mid, user, created_at, text_raw, pic_ids, pic_infos }) => {
            const news = {
                url: `http://api.weibo.com/2/statuses/go?uid=${user.id}&id=${mid}`,
                source: "Weibo/CN",
                author: user.screen_name,
                authorImg: user.profile_image_url,
                content: text_raw,
                timestamp: new Date(created_at),
                media: pic_ids?.map((picId) => ({
                    type: "photo",
                    url: pic_infos?.[picId].original.url,
                    previewUrl: pic_infos?.[picId].thumbnail.url,
                })) ?? [],
            };
            return await fastify.report(news);
        }));
        setTimeout(() => watch(), FETCH_INTERVAL);
    };
    watch();
    console.log("[@plugin/cn-weibo] Interval fetch installed");
}, {
    name: "cn-weibo",
    dependencies: ["report"],
});

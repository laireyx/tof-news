"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    const got = await import("got").then((module) => module.default);
    const FETCH_INTERVAL = 60 * 1000;
    let lastTimestamp = new Date(0);
    const newsBoardUrl = "https://na.levelinfiniteapps.com/api/trpc/trpc.wegame_app_global.information_feeds_svr.InformationFeedsSvr/GetContentByLabel";
    const watch = async () => {
        const result = await got
            .post(newsBoardUrl, {
            headers: {
                "x-areaid": "na",
                "x-gameid": "4",
                "x-language": "en",
                "x-source": "pc_web",
            },
            json: {
                gameid: "4",
                offset: 0,
                get_num: 10,
                primary_label_id: "158",
                secondary_label_id: "260",
                use_default_language: false,
                language: ["en"],
            },
        })
            .json();
        await Promise.all(result.data.info_content
            .sort((a, b) => +a.pub_timestamp - +b.pub_timestamp)
            .map(async ({ content_id, author, content_part, pub_timestamp, pic_urls, }) => {
            const timestamp = new Date(1000 * +pub_timestamp);
            if (timestamp < lastTimestamp)
                return;
            else
                lastTimestamp = timestamp;
            const news = {
                url: `https://www.toweroffantasy-global.com/news-detail.html?content_id=${content_id}&`,
                source: "Homepage/EN",
                author,
                content: content_part + "...",
                timestamp,
                media: pic_urls.map((pictureUrl) => ({
                    type: "photo",
                    url: pictureUrl,
                })),
            };
            return await fastify.report(news);
        }));
        setTimeout(() => watch(), FETCH_INTERVAL);
    };
    watch();
    console.log("[@plugin/global-official] Interval fetch installed");
}, {
    name: "global-official",
    dependencies: ["report"],
});

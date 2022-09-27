"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function default_1(fastify) {
    const collection = fastify.mongo.db?.collection("news");
    const NEWS_PER_PAGE = 10;
    fastify.get("/", {
        preValidation: (request, reply, done) => {
            const { p, source } = request.query;
            if (p < 0 || Number.isInteger(p)) {
                done(new Error("Invalid page number"));
            }
            if (source !== "all" && source !== "Twitter" && source !== "Weibo") {
                done(new Error("Invalid news source"));
            }
            done(undefined);
        },
    }, async function (request) {
        const { p, source } = request.query;
        const newsArray = await collection
            ?.find({
            source: {
                $regex: `^${source}`,
            },
        })
            .sort({ timestamp: -1 })
            .skip(p * NEWS_PER_PAGE)
            .limit(NEWS_PER_PAGE)
            .toArray();
        return newsArray;
    });
}
exports.default = default_1;

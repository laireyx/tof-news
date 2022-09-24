"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    fastify.decorate("report", async function (news) {
        console.log("[@plugin/report] News: ", JSON.stringify(news, null, 2));
        const newsCollection = await fastify.mongo.db?.collection("news");
        return await newsCollection?.insertOne(news);
    });
}, {
    name: "report",
    dependencies: ["mongodb"],
});

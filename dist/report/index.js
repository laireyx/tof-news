"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const node_process_1 = require("node:process");
const client = new mongodb_1.MongoClient(`mongodb+srv://${node_process_1.env.MONGO_AUTHORITY}/tof-news?retryWrites=true&w=majority`);
async function report(news) {
    const connection = await client.connect();
    const newsCollection = connection.db().collection("news");
    return await newsCollection.insertOne(news);
}
exports.default = report;

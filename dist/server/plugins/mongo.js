"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const mongodb_1 = __importDefault(require("@fastify/mongodb"));
const node_process_1 = require("node:process");
/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    fastify.register(mongodb_1.default, {
        url: `mongodb+srv://${node_process_1.env.MONGO_AUTHORITY}`,
    });
}, {
    name: "mongodb",
});

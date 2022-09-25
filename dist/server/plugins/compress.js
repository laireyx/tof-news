"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const compress_1 = __importDefault(require("@fastify/compress"));
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    await fastify.register(compress_1.default);
    console.log("[@plugin/compress] @fastify/compress registered");
}, {
    name: "compress",
});

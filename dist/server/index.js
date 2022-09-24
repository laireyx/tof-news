"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const autoload_1 = __importDefault(require("@fastify/autoload"));
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = require("node:process");
function start() {
    const server = (0, fastify_1.default)({ logger: true });
    server.register(autoload_1.default, {
        dir: node_path_1.default.join(__dirname, "plugins"),
    });
    server.register(autoload_1.default, {
        dir: node_path_1.default.join(__dirname, "routes"),
    });
    server.get("/", async () => {
        return { message: "OK" };
    });
    server.listen({ port: +(node_process_1.env.PORT ?? "3000"), host: "0.0.0.0" });
}
exports.default = start;

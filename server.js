console.log("MCP works");

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fs from "fs/promises";
import path from "path";

// 🔴 ВАЖНО: укажи путь к своему проекту
const PROJECT_ROOT = "/Users/pavelvasiliev/PhpstormProjects/evolvity-client";

const server = new Server(
    {
        name: "local-dev-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

function resolveSafePath(relativePath) {
    const fullPath = path.resolve(PROJECT_ROOT, relativePath);
    if (!fullPath.startsWith(PROJECT_ROOT)) {
        throw new Error("Access denied");
    }
    return fullPath;
}

// список инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_file",
                description: "Read file contents",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string" }
                    },
                    required: ["path"]
                }
            },
            {
                name: "write_file",
                description: "Write content to a file",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string" },
                        content: { type: "string" }
                    },
                    required: ["path", "content"]
                }
            },
            {
                name: "list_files",
                description: "List files in a directory",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string" }
                    },
                    required: ["path"]
                }
            }
        ]
    };
});

// реализация инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "read_file") {
            const filePath = resolveSafePath(args.path);
            const content = await fs.readFile(filePath, "utf-8");
            return {
                content: [{ type: "text", text: content }]
            };
        }

        if (name === "write_file") {
            const filePath = resolveSafePath(args.path);
            await fs.writeFile(filePath, args.content, "utf-8");
            return {
                content: [{ type: "text", text: "File written successfully" }]
            };
        }

        if (name === "list_files") {
            const dirPath = resolveSafePath(args.path);
            const files = await fs.readdir(dirPath);
            return {
                content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
            };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }]
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);

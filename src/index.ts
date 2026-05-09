import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerContainerTools } from "./tools/containers.js";
import { registerStackTools } from "./tools/stacks.js";
import { registerEnvironmentTools } from "./tools/environments.js";
import { registerNetworkTools } from "./tools/networks.js";
import { registerVolumeTools } from "./tools/volumes.js";
import { registerImageTools } from "./tools/images.js";
import { registerJobTools } from "./tools/jobs.js";

const VERSION = "1.2.0";

const server = new McpServer({
  name: "dockhand-mcp",
  version: VERSION,
});

server.tool("get_version", "Returns the running dockhand-mcp server version", {}, async () => ({
  content: [{ type: "text", text: VERSION }],
}));

registerContainerTools(server);
registerStackTools(server);
registerEnvironmentTools(server);
registerNetworkTools(server);
registerVolumeTools(server);
registerImageTools(server);
registerJobTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

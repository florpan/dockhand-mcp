import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dockhandRequest, envQuery, environmentIdSchema } from "../dockhand.js";

export function registerImageTools(server: McpServer): void {
  server.tool(
    "list_images",
    "List all Docker images available on the host",
    { environmentId: environmentIdSchema },
    async ({ environmentId }) => {
      const images = await dockhandRequest<unknown[]>(
        `/api/images?${envQuery(environmentId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(images, null, 2) }],
      };
    }
  );

  server.tool(
    "inspect_image",
    "Get detailed information about a Docker image including layers and history",
    {
      id: z.string().describe("Image ID or name:tag"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      const info = await dockhandRequest<unknown>(
        `/api/images/${encodeURIComponent(id)}?${envQuery(environmentId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }
  );

  server.tool(
    "remove_image",
    "Remove a Docker image from the host",
    {
      id: z.string().describe("Image ID or name:tag"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/images/${encodeURIComponent(id)}?${envQuery(environmentId)}`,
        { method: "DELETE" }
      );
      return {
        content: [{ type: "text", text: `Image '${id}' removed.` }],
      };
    }
  );

  server.tool(
    "prune_images",
    "Remove all unused Docker images (not referenced by any container)",
    { environmentId: environmentIdSchema },
    async ({ environmentId }) => {
      const result = await dockhandRequest<unknown>(
        `/api/images/prune?${envQuery(environmentId)}`,
        { method: "POST" }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "pull_image",
    "Pull a Docker image from a registry to the host. Use this before redeploying a stack that uses a mutable tag like ':latest' so the redeploy actually picks up the new image.",
    {
      image: z
        .string()
        .describe("Image reference to pull, e.g. 'nginx:latest' or 'registry.example.com/team/app:1.2.3'"),
      environmentId: environmentIdSchema,
    },
    async ({ image, environmentId }) => {
      const result = await dockhandRequest<unknown>(
        `/api/images/pull?${envQuery(environmentId)}`,
        {
          method: "POST",
          body: JSON.stringify({ image }),
        }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

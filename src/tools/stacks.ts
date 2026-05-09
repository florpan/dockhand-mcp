import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dockhandRequest, envQuery, environmentIdSchema } from "../dockhand.js";

export function registerStackTools(server: McpServer): void {
  server.tool(
    "list_stacks",
    "List all Docker Compose stacks and their current status",
    { environmentId: environmentIdSchema },
    async ({ environmentId }) => {
      const stacks = await dockhandRequest<unknown[]>(
        `/api/stacks?${envQuery(environmentId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(stacks, null, 2) }],
      };
    }
  );

  server.tool(
    "deploy_stack",
    "Deploy or redeploy a Docker Compose stack by its ID or name",
    {
      id: z.string().describe("Stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/stacks/${encodeURIComponent(id)}/deploy?${envQuery(environmentId)}`,
        { method: "POST" }
      );
      return {
        content: [{ type: "text", text: `Stack '${id}' deployed successfully.` }],
      };
    }
  );

  server.tool(
    "start_stack",
    "Start all containers in a Docker Compose stack",
    {
      id: z.string().describe("Stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/stacks/${encodeURIComponent(id)}/start?${envQuery(environmentId)}`,
        { method: "POST" }
      );
      return {
        content: [{ type: "text", text: `Stack '${id}' started successfully.` }],
      };
    }
  );

  server.tool(
    "stop_stack",
    "Stop all containers in a Docker Compose stack",
    {
      id: z.string().describe("Stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/stacks/${encodeURIComponent(id)}/stop?${envQuery(environmentId)}`,
        { method: "POST" }
      );
      return {
        content: [{ type: "text", text: `Stack '${id}' stopped successfully.` }],
      };
    }
  );

  server.tool(
    "sync_stack",
    "Pull latest changes from the git repository and redeploy a git-backed Docker Compose stack",
    {
      id: z.string().describe("Git stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/git/stacks/${encodeURIComponent(id)}/sync?${envQuery(environmentId)}`,
        { method: "POST" }
      );
      return {
        content: [{ type: "text", text: `Git stack '${id}' synced and redeployed successfully.` }],
      };
    }
  );

  server.tool(
    "get_stack_file",
    "Get the docker-compose YAML for an existing stack",
    {
      id: z.string().describe("Stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      const result = await dockhandRequest<{ content: string }>(
        `/api/stacks/${encodeURIComponent(id)}/compose?${envQuery(environmentId)}`
      );
      return {
        content: [{ type: "text", text: result.content ?? "" }],
      };
    }
  );

  server.tool(
    "update_stack_file",
    "Update the docker-compose YAML for an existing stack. Does not redeploy on its own — call deploy_stack afterwards to apply the change.",
    {
      id: z.string().describe("Stack ID or name"),
      content: z.string().describe("Full docker-compose YAML content for the stack"),
      environmentId: environmentIdSchema,
    },
    async ({ id, content, environmentId }) => {
      await dockhandRequest(
        `/api/stacks/${encodeURIComponent(id)}/compose?${envQuery(environmentId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
        }
      );
      return {
        content: [{ type: "text", text: `Stack '${id}' compose file updated. Run deploy_stack to apply.` }],
      };
    }
  );

  server.tool(
    "create_stack",
    "Create a new Docker Compose stack from a YAML file. Fails if a stack with the same name already exists.",
    {
      name: z.string().describe("Stack name (used as the compose project name)"),
      content: z.string().describe("Full docker-compose YAML content for the stack"),
      environmentId: environmentIdSchema,
    },
    async ({ name, content, environmentId }) => {
      const result = await dockhandRequest<unknown>(
        `/api/stacks?${envQuery(environmentId)}`,
        {
          method: "POST",
          body: JSON.stringify({ name, content }),
        }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "remove_stack",
    "Remove a Docker Compose stack and stop its containers. Volumes and named networks created by the stack may persist depending on Dockhand's configuration.",
    {
      id: z.string().describe("Stack ID or name"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      await dockhandRequest(
        `/api/stacks/${encodeURIComponent(id)}?${envQuery(environmentId)}`,
        { method: "DELETE" }
      );
      return {
        content: [{ type: "text", text: `Stack '${id}' removed.` }],
      };
    }
  );
}

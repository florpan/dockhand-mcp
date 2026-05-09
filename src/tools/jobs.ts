import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dockhandRequest, envQuery, environmentIdSchema } from "../dockhand.js";

export function registerJobTools(server: McpServer): void {
  server.tool(
    "get_job_status",
    "Get the status of a long-running Dockhand job by ID. Use this to poll a jobId returned from async operations like pull_image. Returns a 'Job not found' error once the job has finished and been garbage-collected, which is the typical signal of completion when not polling continuously.",
    {
      id: z.string().describe("Job ID returned by an async operation"),
      environmentId: environmentIdSchema,
    },
    async ({ id, environmentId }) => {
      const result = await dockhandRequest<unknown>(
        `/api/jobs/${encodeURIComponent(id)}?${envQuery(environmentId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

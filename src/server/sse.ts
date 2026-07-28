import { getLogger } from "@logtape/logtape";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

const logger = getLogger(["nogoo9", "server", "sse"]);

export interface McpSession {
	server: McpServer;
	transport: WebStandardStreamableHTTPServerTransport;
}

export class McpSessionManager {
	private readonly sessions = new Map<string, McpSession>();

	public get(sessionId: string): McpSession | undefined {
		return this.sessions.get(sessionId);
	}

	public has(sessionId: string): boolean {
		return this.sessions.has(sessionId);
	}

	public set(sessionId: string, session: McpSession): void {
		logger.info("Session initialized: {sessionId}", { sessionId });
		this.sessions.set(sessionId, session);
	}

	public async closeSession(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (session) {
			logger.info("Session closed: {sessionId}", { sessionId });
			this.sessions.delete(sessionId);
			try {
				await session.server.close();
			} catch (_) {}
		}
	}

	public async resetAll(): Promise<void> {
		for (const session of this.sessions.values()) {
			try {
				await session.server.close();
			} catch (_) {}
		}
		this.sessions.clear();
	}
}

export const sessionManager = new McpSessionManager();

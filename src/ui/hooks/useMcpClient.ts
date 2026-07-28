import { useEffect, useState } from "react";

export function useMcpClient(app: any, token: string) {
	const [isInitialized, setIsInitialized] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		async function connectApp() {
			try {
				await app.connect();
				if (isMounted) {
					setIsInitialized(true);
				}
			} catch (err: any) {
				console.warn("MCP App connect failed, falling back to HTTP:", err);
				if (isMounted) {
					setIsInitialized(true);
				}
			}
		}
		connectApp();
		return () => {
			isMounted = false;
		};
	}, [app]);

	const callTool = async (name: string, args: Record<string, unknown> = {}) => {
		try {
			if (token) {
				args.jwtPayload = undefined; // handled statelessly via authorization/cookie
			}
			return await app.callTool({ name, arguments: args });
		} catch (err: any) {
			setError(err.message || String(err));
			throw err;
		}
	};

	return { isInitialized, error, callTool };
}

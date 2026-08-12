// Ensure global browser primitives exist for Bun runtime microtasks
if (typeof (globalThis as any).File === "undefined") {
	(globalThis as any).File = class File {};
}

import { createFastifyApp } from "~/server/index.js";

async function runUiE2eTest() {
	console.log("==> Starting UI E2E Verification Test...");

	const app = await createFastifyApp();
	const address = await app.listen({ port: 0, host: "127.0.0.1" });
	console.log(`==> UI E2E test server listening at ${address}`);

	try {
		// 1. Verify GET /ui
		const uiResp = await fetch(`${address}/ui`);
		if (!uiResp.ok) {
			throw new Error(`GET /ui failed with status ${uiResp.status}`);
		}
		const uiContentType = uiResp.headers.get("content-type") || "";
		if (!uiContentType.includes("text/html")) {
			throw new Error(
				`GET /ui content-type expected text/html, got ${uiContentType}`,
			);
		}
		const uiHtml = await uiResp.text();
		if (
			!uiHtml.includes("nogoo9 Pod Manager") ||
			!uiHtml.includes('<div id="root">')
		) {
			throw new Error("GET /ui HTML response missing expected markup elements");
		}
		console.log("✓ GET /ui returned 200 OK with valid HTML markup");

		// 2. Verify GET /ui/
		const uiSlashResp = await fetch(`${address}/ui/`);
		if (!uiSlashResp.ok) {
			throw new Error(`GET /ui/ failed with status ${uiSlashResp.status}`);
		}
		console.log("✓ GET /ui/ returned 200 OK");

		// 3. Verify GET /ui/error.html
		const errorResp = await fetch(`${address}/ui/error.html`);
		if (!errorResp.ok) {
			throw new Error(
				`GET /ui/error.html failed with status ${errorResp.status}`,
			);
		}
		console.log("✓ GET /ui/error.html returned 200 OK");

		// 4. Verify GET /api/themes
		const themesResp = await fetch(`${address}/api/themes`);
		if (!themesResp.ok) {
			throw new Error(
				`GET /api/themes failed with status ${themesResp.status}`,
			);
		}
		const themesData = (await themesResp.json()) as any;
		if (!Array.isArray(themesData)) {
			throw new Error(
				"GET /api/themes response format invalid (expected array)",
			);
		}
		console.log(
			`✓ GET /api/themes returned ${themesData.length} available themes`,
		);

		// 5. Verify GET /api/themes/default
		const defaultThemeResp = await fetch(`${address}/api/themes/default`);
		if (!defaultThemeResp.ok) {
			throw new Error(
				`GET /api/themes/default failed with status ${defaultThemeResp.status}`,
			);
		}
		console.log("✓ GET /api/themes/default returned 200 OK");

		// 6. Extract and evaluate bundled UI JavaScript
		const scriptMatch = uiHtml.match(
			/<script type="module">([\s\S]*?)<\/script>/i,
		);
		if (!scriptMatch?.[1]) {
			throw new Error(
				'Could not find <script type="module"> tag in bundled UI HTML',
			);
		}
		const bundledJs = scriptMatch[1];
		console.log(
			`==> Testing bundled JS payload execution (${bundledJs.length} bytes)...`,
		);

		// Verify no top-level export statements
		if (/\bexport\s*\{/.test(bundledJs)) {
			throw new Error(
				"SyntaxError in bundle: Top-level export statement found",
			);
		}

		let docMock: any;

		class MockElement {
			nodeType = 1;
			nodeName = "DIV";
			tagName = "DIV";
			children: MockElement[] = [];
			childNodes: MockElement[] = [];
			attributes: any[] = [];
			style: Record<string, string> = {};
			dataset: Record<string, string> = {};
			classList = { add: () => {}, remove: () => {}, toggle: () => {} };
			get ownerDocument() {
				return docMock;
			}
			setAttribute() {}
			removeAttribute() {}
			appendChild(child: any) {
				this.children.push(child);
				this.childNodes.push(child);
				return child;
			}
			insertBefore(child: any) {
				this.children.push(child);
				this.childNodes.push(child);
				return child;
			}
			removeChild() {}
			addEventListener() {}
			removeEventListener() {}
		}

		class MockText extends MockElement {
			nodeType = 3;
			nodeName = "#text";
			nodeValue = "";
		}
		class MockComment extends MockElement {
			nodeType = 8;
			nodeName = "#comment";
		}
		class MockDocument extends MockElement {
			nodeType = 9;
		}

		const rootEl = new MockElement();
		const headEl = new MockElement();
		const bodyEl = new MockElement();

		docMock = new Proxy(new MockDocument(), {
			get(target: any, prop: string) {
				if (prop === "nodeType") return 9;
				if (prop === "getElementById") {
					return (id: string) => (id === "root" ? rootEl : new MockElement());
				}
				if (prop === "createElement") {
					return () => new MockElement();
				}
				if (prop === "createTextNode") {
					return new MockText();
				}
				if (prop === "createComment") {
					return new MockComment();
				}
				if (prop === "head") return headEl;
				if (prop === "body") return bodyEl;
				if (prop in target) return target[prop];
				return () => {};
			},
		});

		const mockClass = class {};

		const winMock: any = new Proxy(
			{
				location: {
					pathname: "/ui",
					href: `${address}/ui`,
					origin: address,
					search: "",
				},
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
				},
				sessionStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
				},
				addEventListener: () => {},
				removeEventListener: () => {},
				history: { replaceState: () => {} },
				document: docMock,
				navigator: { userAgent: "Mozilla/5.0" },
				fetch: async () => ({
					ok: true,
					json: async () => ({}),
					text: async () => "",
				}),
				console: {
					...console,
					debug: () => {},
					error: () => {},
					log: () => {},
				},
				MessageChannel: class {
					port1 = { onmessage: null };
					port2 = { postMessage: () => {} };
				},
				File: (globalThis as any).File,
				Error: globalThis.Error,
				TypeError: globalThis.TypeError,
				SyntaxError: globalThis.SyntaxError,
				ReferenceError: globalThis.ReferenceError,
				Object: globalThis.Object,
				Array: globalThis.Array,
				Function: globalThis.Function,
				__NOCR_BASE_URL__: "",
				__NOCR_OAUTH_CONFIG__: {},
				__NOCR_UI_CONFIG__: {},
			},
			{
				has() {
					return true;
				},
				get(target: any, prop: string) {
					if (prop === "window" || prop === "globalThis" || prop === "self")
						return winMock;
					if (prop in target) return target[prop];
					if (
						typeof prop === "string" &&
						(prop.startsWith("HTML") || prop.endsWith("Element"))
					) {
						return mockClass;
					}
					return (globalThis as any)[prop] ?? mockClass;
				},
			},
		);

		let evalError: Error | null = null;
		try {
			const fn = new Function(
				"window",
				"document",
				"navigator",
				"fetch",
				"location",
				"localStorage",
				"sessionStorage",
				"MessageChannel",
				"Error",
				"TypeError",
				"SyntaxError",
				"ReferenceError",
				"globalThis",
				"self",
				bundledJs,
			);
			fn(
				winMock,
				docMock,
				winMock.navigator,
				winMock.fetch,
				winMock.location,
				winMock.localStorage,
				winMock.sessionStorage,
				winMock.MessageChannel,
				globalThis.Error,
				globalThis.TypeError,
				globalThis.SyntaxError,
				globalThis.ReferenceError,
				winMock,
				winMock,
			);
		} catch (err: any) {
			evalError = err;
		}

		if (evalError) {
			throw new Error(
				`Bundled JS evaluation failed with runtime error: ${evalError.message}`,
			);
		}
		console.log(
			"✓ Bundled JS evaluated cleanly without ReferenceError or SyntaxError",
		);

		console.log("==> UI E2E Verification Complete: SUCCESS");
	} finally {
		await app.close();
		process.exit(0);
	}
}

runUiE2eTest().catch((err) => {
	console.error("UI E2E Verification Failed:", err);
	process.exit(1);
});

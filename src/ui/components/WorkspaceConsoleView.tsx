import React, { useEffect, useState } from "react";
import { app } from "~/ui/app.js";
import { I } from "~/ui/icons.js";
import type { Workspace } from "~/ui/types.js";
import { decodeJwt, jsonToYaml } from "~/ui/utils.js";

export interface WorkspaceConsoleViewProps {
	workspaceId: string;
	namespace: string;
	activeToken: string;
	currentUser: string;
	basePath: string;
	onBack: () => void;
	refreshAll: () => void;
}

export function WorkspaceConsoleView({
	workspaceId,
	namespace,
	activeToken,
	currentUser,
	basePath,
	onBack,
	refreshAll,
}: WorkspaceConsoleViewProps) {
	const [ws, setWs] = useState<Workspace | null>(null);
	const [activeLogs, setActiveLogs] = useState("");
	const [activeEvents, setActiveEvents] = useState("");
	const [activeTab, setActiveTab] = useState<
		"terminal" | "preview" | "logs" | "yaml" | "apis"
	>("terminal");

	const tokenQuery = activeToken
		? `?token=${encodeURIComponent(activeToken)}`
		: "";

	const loadDetails = async () => {
		try {
			const res = await app.callServerTool({
				name: "get_workspace",
				arguments: {
					id: workspaceId,
					namespace,
					jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
				},
			});
			if (res && !res.isError && res.structuredContent) {
				setWs(res.structuredContent as any);
			}
		} catch (_) {}
	};

	const fetchLogsAndEvents = async () => {
		if (!ws) return;
		try {
			const evRes = await app.callServerTool({
				name: "get_workspace_events",
				arguments: {
					id: ws.id,
					namespace,
					jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
				},
			});
			if (evRes && !evRes.isError && evRes.structuredContent) {
				const events = (evRes.structuredContent as any).events || [];
				setActiveEvents(
					events
						.map(
							(ev: any) =>
								`[${ev.lastTimestamp || ev.firstTimestamp}] ${ev.type} - ${ev.reason}: ${ev.message}`,
						)
						.join("\n"),
				);
			}

			if (ws.podName) {
				const logRes = await app.callServerTool({
					name: "get_pod_logs",
					arguments: {
						name: ws.podName,
						namespace,
						jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
					},
				});
				if (logRes && !logRes.isError && logRes.structuredContent) {
					setActiveLogs((logRes.structuredContent as any).logs || "");
				}
			}
		} catch (_) {}
	};

	useEffect(() => {
		void loadDetails();
	}, [workspaceId]);

	useEffect(() => {
		if (ws) {
			void fetchLogsAndEvents();
			const interval = setInterval(() => {
				void fetchLogsAndEvents();
			}, 5000);
			return () => clearInterval(interval);
		}
	}, [ws]);

	useEffect(() => {
		if (ws) {
			const isOwner = !ws.userSub || ws.userSub === currentUser;
			if (!isOwner && (activeTab === "terminal" || activeTab === "preview")) {
				setActiveTab("logs");
			}
		}
	}, [ws, currentUser, activeTab]);

	if (!ws) {
		return (
			<div className="py-12 text-center text-[var(--ink-3)] font-mono">
				Loading details console...
			</div>
		);
	}

	const pathPart = ws.workspacePath || ws.previewPath || "/";
	const cleanPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;

	const workspaceUrl = `${basePath}/route/${ws.id}${cleanPath}${tokenQuery}`;
	const terminalUrl = `${basePath}/route/${ws.id}/terminal/${tokenQuery}`;

	const workspaceTabUrl = `${basePath}/route/${ws.id}${cleanPath}`;
	const terminalTabUrl = `${basePath}/route/${ws.id}/terminal/`;

	const isOwner = !ws.userSub || ws.userSub === currentUser;

	return (
		<div className="mt-6 flex flex-col gap-6 animate-fadeUp select-text">
			<div className="flex items-center justify-between">
				<button className="btn btn-ghost py-1 text-xs" onClick={onBack}>
					<I.back className="w-3.5 h-3.5 mr-1" /> Back to Sandboxes
				</button>
				<h2 className="text-sm font-bold font-mono text-[var(--ink-2)] truncate">
					Console: {ws.id}
				</h2>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
				<div className="lg:col-span-4 flex flex-col gap-6">
					<div className="card p-5 space-y-4">
						<div className="border-b border-[var(--line)] pb-3">
							<h3 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">
								Sandbox Specifications
							</h3>
							{ws.name && (
								<p className="text-sm font-extrabold text-[var(--ink)] mt-1">
									{ws.name}
								</p>
							)}
						</div>

						<div className="space-y-3.5 text-xs text-[var(--ink-2)] font-medium">
							<div className="flex justify-between gap-2">
								<span className="text-[var(--ink-3)] font-bold">Status:</span>
								<span className="font-mono text-emerald-500">{ws.status}</span>
							</div>
							{ws.templateRef && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Template:</span>
									<span className="font-mono">
										{ws.templateRef}
										{ws.templateVersion &&
											(ws.isOutdated && ws.latestTemplateVersion
												? ` (v${ws.templateVersion} → v${ws.latestTemplateVersion})`
												: ` (v${ws.templateVersion})`)}
									</span>
								</div>
							)}
							{ws.podIP && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Pod IP:</span>
									<span className="font-mono">{ws.podIP}</span>
								</div>
							)}
							{ws.port && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Target Port:</span>
									<span className="font-mono">{ws.port}</span>
								</div>
							)}
							{ws.userSub && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Owner:</span>
									<span className="font-mono">{ws.userSub}</span>
								</div>
							)}
							{ws.annotations?.["nogoo9/last-upgrade-error"] && (
								<div className="mt-4 pt-3 border-t border-[var(--line)] border-dashed space-y-1">
									<span className="text-[10px] uppercase font-bold text-red-500 tracking-wider flex items-center gap-1.5">
										<I.info className="w-3.5 h-3.5" />
										Last Upgrade Error
									</span>
									<p className="font-mono text-[11px] text-red-600 dark:text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 whitespace-pre-wrap break-all leading-normal">
										{ws.annotations["nogoo9/last-upgrade-error"]}
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="card p-5 flex-1 flex flex-col min-h-[300px]">
						<h3 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider mb-2.5 pb-2 border-b border-[var(--line)]">
							System K8s Events
						</h3>
						<pre className="flex-1 text-[10px] font-mono text-[var(--ink-2)] bg-[var(--sunken)] p-3 rounded-lg overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
							{activeEvents || "No events recorded."}
						</pre>
					</div>
				</div>

				<div className="lg:col-span-8 card overflow-hidden flex flex-col min-h-[550px] bg-[var(--sunken)]">
					<div className="bg-[var(--surface)] border-b border-[var(--line)] px-4 py-2 flex items-center justify-between">
						<div className="flex gap-2">
							{isOwner && (
								<>
									<button
										onClick={() => setActiveTab("terminal")}
										className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "terminal" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
									>
										Interactive Terminal
									</button>
									<button
										onClick={() => setActiveTab("preview")}
										className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "preview" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
									>
										Web Preview
									</button>
								</>
							)}
							<button
								onClick={() => setActiveTab("logs")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "logs" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Console stdout
							</button>
							<button
								onClick={() => setActiveTab("yaml")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "yaml" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Pod YAML
							</button>
							<button
								onClick={() => setActiveTab("apis")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "apis" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								APIs
							</button>
						</div>

						{isOwner && ["terminal", "preview"].includes(activeTab) && (
							<a
								href={activeTab === "terminal" ? terminalTabUrl : workspaceTabUrl}
								target="_blank"
								className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
								rel="noreferrer"
							>
								Launch Independent Tab{" "}
								<svg
									className="w-3 h-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2.5"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						)}
					</div>

					<div className="flex-1 bg-[var(--sunken)] relative min-h-[480px]">
						{activeTab === "terminal" && isOwner && (
							<iframe
								src={terminalUrl}
								className="w-full h-full border-none absolute inset-0 bg-[#1e1e1e]"
								sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								title="Interactive container terminal shell"
							/>
						)}

						{activeTab === "preview" && isOwner && (
							<iframe
								src={workspaceUrl}
								className="w-full h-full border-none absolute inset-0 bg-white"
								sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								title="Workspace active environment preview"
							/>
						)}

						{activeTab === "logs" && (
							<pre className="absolute inset-0 p-5 font-mono text-xs text-neutral-300 bg-neutral-900 overflow-y-auto select-text leading-relaxed">
								{activeLogs || "No logs generated by container output."}
							</pre>
						)}

						{activeTab === "yaml" && (
							<div className="absolute inset-0 p-5 overflow-y-auto bg-neutral-950 font-mono text-[11px] text-neutral-300 select-text leading-relaxed">
								<div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800">
									<span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
										Kubernetes Pod YAML Manifest
									</span>
									<button
										onClick={() => {
											navigator.clipboard.writeText(jsonToYaml(ws.pod || ws).trim());
										}}
										className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
									>
										Copy YAML
									</button>
								</div>
								<pre className="whitespace-pre overflow-x-auto leading-relaxed">
									{jsonToYaml(ws.pod || ws).trim()}
								</pre>
							</div>
						)}

						{activeTab === "apis" && (
							<div className="absolute inset-0 p-6 overflow-y-auto bg-[var(--sunken)] select-text">
								<div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--line)]">
									<h4 className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider">
										Exposed Workspace APIs
									</h4>
									<span className="text-[10px] font-mono text-[var(--ink-3)] font-medium">
										Parsed from nogoo9/api annotations
									</span>
								</div>

								{ws.apis && ws.apis.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="w-full text-left border-collapse text-xs">
											<thead>
												<tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-wider text-[var(--ink-3)] font-bold">
													<th className="py-2 px-3 font-semibold">Name</th>
													<th className="py-2 px-3 font-semibold">Method</th>
													<th className="py-2 px-3 font-semibold">Path</th>
													<th className="py-2 px-3 font-semibold">Description</th>
													<th className="py-2 px-3 font-semibold text-right">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line)] text-[var(--ink-2)] font-medium">
												{ws.apis.map((api) => {
													const isGet =
														!api.method ||
														api.method
															.split(",")
															.map((m) => m.trim().toUpperCase())
															.includes("GET");
													const apiLink = `${basePath}/route/${ws.id}${api.path}${tokenQuery}`;

													const methodText = api.method
														? api.method.toUpperCase()
														: "GET";
													let methodStyle =
														"bg-neutral-500/10 text-neutral-500 border-neutral-500/20";
													if (methodText.includes("GET"))
														methodStyle =
															"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
													else if (methodText.includes("POST"))
														methodStyle =
															"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
													else if (
														methodText.includes("WS") ||
														methodText.includes("WEBSOCKET")
													)
														methodStyle =
															"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

													return (
														<tr
															key={api.name}
															className="hover:bg-[var(--surface)] transition-colors"
														>
															<td className="py-3 px-3 font-bold font-mono text-[var(--ink)]">
																{api.name}
															</td>
															<td className="py-3 px-3">
																<span
																	className={`px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wider ${methodStyle}`}
																>
																	{methodText}
																</span>
															</td>
															<td className="py-3 px-3 font-mono text-[var(--ink-2)]">
																{api.path}
															</td>
															<td
																className="py-3 px-3 text-[var(--ink-2)] font-medium max-w-[200px] truncate"
																title={api.desc}
															>
																{api.desc || "-"}
															</td>
															<td className="py-3 px-3 text-right">
																{isGet ? (
																	<a
																		href={apiLink}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors shadow-sm"
																	>
																		Call GET{" "}
																		<svg
																			className="w-2.5 h-2.5"
																			fill="none"
																			viewBox="0 0 24 24"
																			stroke="currentColor"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth="2.5"
																				d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																			/>
																		</svg>
																	</a>
																) : (
																	<span className="text-[10px] text-[var(--ink-3)] italic font-medium">
																		Non-GET Endpoint
																	</span>
																)}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-8 text-center text-[var(--ink-3)] font-mono italic">
										No dynamic API endpoints exposed by this workspace.
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

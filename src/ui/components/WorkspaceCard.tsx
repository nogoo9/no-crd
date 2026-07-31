import React, { useEffect, useState } from "react";
import { I } from "~/ui/icons.js";
import type { Workspace } from "~/ui/types.js";
import { formatRelativeTime } from "~/ui/utils.js";

export interface WorkspaceCardProps {
	ws: Workspace;
	layoutMode: "grid" | "list";
	basePath: string;
	activeToken: string;
	density: string;
	currentUser: string;
	workspaceOpenMode: "tab" | "inline";
	isAdmin?: boolean;
	onStop: () => void;
	onUpgrade: () => void;
	onShowLogs: () => void;
	onShowEvents: () => void;
	onOpenDetails: () => void;
	onShowPreview: (path: string, type: string) => void;
}

export function WorkspaceCard({
	ws,
	layoutMode,
	basePath,
	activeToken,
	density,
	currentUser,
	workspaceOpenMode,
	onStop,
	onUpgrade,
	onShowLogs,
	onShowEvents,
	onOpenDetails,
	onShowPreview,
	isAdmin = false,
}: WorkspaceCardProps) {
	const pathPart = ws.workspacePath || ws.previewPath || "/";
	const cleanPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
	const openUrl = `${basePath}/route/${ws.id}${cleanPath}`;
	const isOwner = !ws.userSub || ws.userSub === currentUser;

	const [stats, setStats] = useState<Record<string, any> | null>(null);
	const [lastActivity, setLastActivity] = useState<number | null>(null);

	useEffect(() => {
		if (ws.status !== "Running") {
			setStats(null);
			setLastActivity(null);
			return;
		}

		const statsApi = ws.apis?.find((a) => a.name === "stats");
		const activityApi = ws.apis?.find(
			(a) => a.name === "last_activity" || a.name === "last-activity",
		);

		let statsIntervalId: any = null;
		let activityIntervalId: any = null;

		const fetchStats = async () => {
			if (!statsApi) return;
			try {
				const q = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
				const res = await fetch(`${basePath}/route/${ws.id}${statsApi.path}${q}`);
				if (res.ok) {
					const data = await res.json();
					if (data && data.stats) {
						setStats(data.stats);
					}
				}
			} catch (_) {}
		};

		const fetchActivity = async () => {
			if (!activityApi) return;
			try {
				const q = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
				const res = await fetch(`${basePath}/route/${ws.id}${activityApi.path}${q}`);
				if (res.ok) {
					const data = await res.json();
					if (data && data.last_activity) {
						setLastActivity(Number(data.last_activity));
					}
				}
			} catch (_) {}
		};

		const statsRefreshStr =
			statsApi?.refresh || ws.annotations?.["nogoo9/api.stats.refresh"] || "30s";
		const activityRefreshStr =
			activityApi?.refresh ||
			ws.annotations?.["nogoo9/api.last_activity.refresh"] ||
			"30s";

		if (statsApi) {
			void fetchStats();
			if (statsRefreshStr !== "init") {
				let ms = 30000;
				if (statsRefreshStr.endsWith("s")) ms = Number.parseInt(statsRefreshStr) * 1000;
				else if (statsRefreshStr.endsWith("m"))
					ms = Number.parseInt(statsRefreshStr) * 60 * 1000;
				if (!Number.isNaN(ms) && ms > 0) {
					statsIntervalId = setInterval(() => {
						void fetchStats();
					}, ms);
				}
			}
		}

		if (activityApi) {
			void fetchActivity();
			if (activityRefreshStr !== "init") {
				let ms = 30000;
				if (activityRefreshStr.endsWith("s")) ms = Number.parseInt(activityRefreshStr) * 1000;
				else if (activityRefreshStr.endsWith("m"))
					ms = Number.parseInt(activityRefreshStr) * 60 * 1000;
				if (!Number.isNaN(ms) && ms > 0) {
					activityIntervalId = setInterval(() => {
						void fetchActivity();
					}, ms);
				}
			}
		}

		return () => {
			if (statsIntervalId) clearInterval(statsIntervalId);
			if (activityIntervalId) clearInterval(activityIntervalId);
		};
	}, [ws.status, ws.id, ws.apis, ws.annotations, basePath, activeToken]);

	const getStatusColorClass = () => {
		if (ws.status === "Running")
			return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
		if (ws.status === "Pending" || ws.status === "Upgrading")
			return "bg-amber-500/10 text-amber-500 border-amber-500/20";
		return "bg-red-500/10 text-red-500 border-red-500/20";
	};

	const isCompact = density === "compact";

	const cardContent = (
		<div
			className={`flex flex-col justify-between h-full ${isCompact ? "gap-2" : "gap-4"}`}
		>
			<div>
				<div className="flex items-center justify-between mb-1.5 min-w-0 gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						{ws.status === "Running" && (
							<span className="relative flex h-1.5 w-1.5 shrink-0">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
							</span>
						)}
						<h3
							className="text-sm font-extrabold font-mono text-[var(--ink)] truncate"
							title={ws.id}
						>
							{ws.id}
						</h3>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						{ws.isOutdated && (
							<span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/15 text-amber-500 border border-amber-500/25 font-bold tracking-wider uppercase">
								Outdated
							</span>
						)}
						<span
							className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider border ${getStatusColorClass()}`}
						>
							{ws.status}
						</span>
					</div>
				</div>

				{(ws.description || ws.name) && (
					<p
						className="text-xs text-[var(--ink-2)] font-semibold mb-2 line-clamp-2"
						title={ws.description || ws.name}
					>
						{ws.description || ws.name}
					</p>
				)}

				<div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-[var(--ink-3)] mb-3 mt-1.5 font-mono">
					{ws.templateRef && (
						<span>
							Tmpl:{" "}
							<strong className="text-[var(--ink-2)]">
								{ws.templateRef}
								{ws.templateVersion &&
									(ws.isOutdated && ws.latestTemplateVersion
										? ` (v${ws.templateVersion} → v${ws.latestTemplateVersion})`
										: ` (v${ws.templateVersion})`)}
							</strong>
						</span>
					)}
					{(ws.owner || ws.userSub) && (
						<span>
							Owner:{" "}
							<strong className="text-[var(--ink-2)]">
								{ws.owner || ws.userSub}
							</strong>
						</span>
					)}
					{ws.creationTime && (
						<span>
							Created:{" "}
							<strong className="text-[var(--ink-2)]">
								{new Date(ws.creationTime).toLocaleString()}
							</strong>
						</span>
					)}
					{ws.podIP && (
						<span>
							IP: <strong className="text-[var(--ink-2)]">{ws.podIP}</strong>
						</span>
					)}
				</div>

				{ws.status === "Running" && (stats || lastActivity) && (
					<div className="mt-2 mb-3 bg-[var(--sunken)] p-3 rounded-xl border border-[var(--line)] text-[11px] space-y-1.5">
						<div className="flex justify-between items-center text-[9px] uppercase font-bold text-[var(--ink-3)] tracking-wider">
							<span className="flex items-center gap-1">Metrics</span>
							{lastActivity && (
								<span className="font-mono text-[var(--ink-3)]">
									Active: {formatRelativeTime(lastActivity)}
								</span>
							)}
						</div>
						{stats && Object.keys(stats).length > 0 && (
							<div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[var(--ink-2)] pt-1 border-t border-[var(--line)] border-dashed">
								{Object.entries(stats).map(([k, v]) => (
									<div key={k} className="flex justify-between min-w-0">
										<span className="text-[var(--ink-3)] truncate mr-1">{k}:</span>
										<span className="font-bold truncate">{String(v)}</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{ws.apis && ws.apis.length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1 border-t border-[var(--line)] pt-2.5">
						{ws.apis.slice(0, 4).map((api) => {
							const methodText = api.method
								? api.method.split(",")[0].toUpperCase()
								: "GET";
							let methodStyle = "bg-neutral-500/15 text-neutral-500";
							if (methodText === "GET")
								methodStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
							else if (methodText === "POST")
								methodStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
							else if (methodText === "WS" || methodText === "WEBSOCKET")
								methodStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
							return (
								<span
									key={api.name}
									className={`px-1 py-0.5 text-[8px] font-bold rounded-md uppercase font-mono tracking-wide ${methodStyle}`}
									title={`${methodText}: ${api.path}`}
								>
									{api.name}
								</span>
							);
						})}
						{ws.apis.length > 4 && (
							<span className="text-[8px] text-[var(--ink-3)] font-mono self-center">
								+{ws.apis.length - 4}
							</span>
						)}
					</div>
				)}

				{ws.annotations?.["nogoo9/last-upgrade-error"] && (
					<div className="mt-2.5 mb-1.5 bg-red-500/5 p-3 rounded-xl border border-red-500/15 text-[11px] space-y-1">
						<div className="flex items-center gap-1.5 uppercase font-bold text-red-500 tracking-wider text-[9px]">
							<I.info className="w-3.5 h-3.5" />
							Last Upgrade Error
						</div>
						<p
							className="font-mono text-red-600 dark:text-red-400 leading-normal break-all line-clamp-3"
							title={ws.annotations["nogoo9/last-upgrade-error"]}
						>
							{ws.annotations["nogoo9/last-upgrade-error"]}
						</p>
					</div>
				)}
			</div>

			<div className="border-t border-[var(--line)] pt-3.5 mt-3 space-y-3">
				{isOwner ? (
					ws.status === "Running" ? (
						workspaceOpenMode === "inline" ? (
							<button
								onClick={() =>
									onShowPreview(
										ws.previewPath || ws.workspacePath || "/",
										ws.previewType || ws.workspaceType || "html",
									)
								}
								className="w-full btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer border-0"
							>
								<I.eye className="w-3.5 h-3.5" />
								Open Workspace Inline
							</button>
						) : (
							<a
								href={openUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="w-full btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer border-0"
							>
								<svg
									className="w-3.5 h-3.5"
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
								Open Workspace Tab
							</a>
						)
					) : ws.status === "Pending" ? (
						<button
							disabled
							className="w-full btn bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 opacity-80"
						>
							<I.refresh className="w-3.5 h-3.5 animate-spin" />
							Starting Workspace...
						</button>
					) : (
						<div className="w-full py-2 bg-[var(--sunken)] rounded-xl border border-[var(--line)] text-center text-xs text-[var(--ink-3)] font-semibold font-mono uppercase tracking-wide">
							Status: {ws.status}
						</div>
					)
				) : (
					<div className="w-full py-2 bg-[var(--sunken)] rounded-xl border border-[var(--line)] text-center text-xs text-[var(--ink-3)] font-semibold font-mono uppercase tracking-wide">
						Status: {ws.status}
					</div>
				)}

				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex gap-1.5">
						<button
							className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1"
							onClick={onOpenDetails}
							title="Console details, specs, events, logs, and APIs"
						>
							<I.terminal className="w-3.5 h-3.5" />
							Details
						</button>

						{isOwner && ws.status === "Running" && workspaceOpenMode === "inline" && (
							<a
								href={openUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1"
							>
								<svg
									className="w-3.5 h-3.5"
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
								Open Tab
							</a>
						)}

						{isOwner &&
							ws.status === "Running" &&
							workspaceOpenMode === "tab" &&
							(ws.previewPath || ws.workspacePath) && (
								<button
									className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1"
									onClick={() =>
										onShowPreview(
											ws.previewPath || ws.workspacePath || "/",
											ws.previewType || ws.workspaceType || "html",
										)
									}
								>
									<I.eye className="w-3.5 h-3.5" />
									Preview
								</button>
							)}

						{(isOwner || isAdmin) &&
							ws.isOutdated &&
							ws.status !== "Upgrading" && (
								<button
									className="btn btn-ghost text-amber-600 hover:bg-amber-500/10 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
									onClick={onUpgrade}
								>
									<I.refresh className="w-3 h-3" />
									Upgrade
								</button>
							)}
					</div>

					<div className="flex">
						{(isOwner || isAdmin) && ws.status === "Running" && (
							<button
								className="btn btn-ghost text-red-500 hover:bg-red-500/10 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1"
								onClick={onStop}
							>
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
										d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
									/>
								</svg>
								Stop
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	if (layoutMode === "list") {
		return <div className="card card-ws-hover p-4 select-text">{cardContent}</div>;
	}

	return (
		<div className="card card-ws-hover p-5 flex flex-col justify-between select-text h-full min-h-[220px]">
			{cardContent}
		</div>
	);
}

import React from "react";
import type { WorkspaceItem } from "../context/AppContext.js";
import { SparklesIcon, TerminalIcon } from "./Icons.js";

interface WorkspaceCardProps {
	workspace: WorkspaceItem;
	onStop: (id: string) => void;
	onUpgrade: (id: string) => void;
	onOpenConsole: (ws: WorkspaceItem) => void;
	isUpgrading?: boolean;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
	workspace,
	onStop,
	onUpgrade,
	onOpenConsole,
	isUpgrading,
}) => {
	const isRunning = workspace.status === "Running";

	return (
		<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg flex flex-col justify-between transition-all hover:border-zinc-700">
			<div>
				<div className="flex items-center justify-between mb-3">
					<h3 className="font-semibold text-white text-base truncate">
						{workspace.id}
					</h3>
					<span
						className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
							isRunning
								? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
								: "bg-amber-500/10 text-amber-400 border-amber-500/20"
						}`}
					>
						{workspace.status}
					</span>
				</div>

				<div className="text-xs text-zinc-400 space-y-1 mb-4">
					<p>
						<span className="text-zinc-500">Pod:</span> {workspace.podName}
					</p>
					{workspace.owner && (
						<p>
							<span className="text-zinc-500">Owner:</span> {workspace.owner}
						</p>
					)}
					{workspace.templateVersion && (
						<p>
							<span className="text-zinc-500">Version:</span>{" "}
							{workspace.templateVersion}
							{workspace.isOutdated && (
								<span className="ml-2 text-amber-400 font-semibold">
									(Outdated -&gt; {workspace.latestTemplateVersion})
								</span>
							)}
						</p>
					)}
				</div>

				{workspace.lastUpgradeError && (
					<div className="mb-4 p-2.5 rounded bg-red-950/40 border border-red-800/40 text-xs text-red-300">
						<span className="font-semibold text-red-400">
							Upgrade Failed:
						</span>{" "}
						{workspace.lastUpgradeError}
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 pt-3 border-t border-zinc-800/80">
				{workspace.isOutdated && (
					<button
						type="button"
						onClick={() => onUpgrade(workspace.id)}
						disabled={isUpgrading}
						className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
					>
						<SparklesIcon className="w-3.5 h-3.5" />
						{isUpgrading ? "Upgrading..." : "Upgrade"}
					</button>
				)}

				<button
					type="button"
					onClick={() => onOpenConsole(workspace)}
					className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all"
				>
					<TerminalIcon className="w-3.5 h-3.5" />
					Console
				</button>

				{isRunning && (
					<button
						type="button"
						onClick={() => onStop(workspace.id)}
						className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
					>
						Stop
					</button>
				)}
			</div>
		</div>
	);
};

import React, { useState } from "react";
import type { WorkspaceItem } from "../context/AppContext.js";

interface ConsoleModalProps {
	workspace: WorkspaceItem;
	onClose: () => void;
}

export const ConsoleModal: React.FC<ConsoleModalProps> = ({
	workspace,
	onClose,
}) => {
	const [activeTab, setActiveTab] = useState<"logs" | "specs" | "terminal">(
		"specs",
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
					<div className="flex items-center gap-3">
						<h2 className="text-lg font-bold text-white">
							Workspace Console: {workspace.id}
						</h2>
						<span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
							{workspace.status}
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
					>
						✕
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40">
					<button
						type="button"
						onClick={() => setActiveTab("specs")}
						className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
							activeTab === "specs"
								? "border-indigo-500 text-indigo-400"
								: "border-transparent text-zinc-400 hover:text-zinc-200"
						}`}
					>
						Specifications
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("logs")}
						className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
							activeTab === "logs"
								? "border-indigo-500 text-indigo-400"
								: "border-transparent text-zinc-400 hover:text-zinc-200"
						}`}
					>
						Logs
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("terminal")}
						className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
							activeTab === "terminal"
								? "border-indigo-500 text-indigo-400"
								: "border-transparent text-zinc-400 hover:text-zinc-200"
						}`}
					>
						Terminal
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 overflow-y-auto flex-1 font-mono text-sm">
					{activeTab === "specs" && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
								<div>
									<span className="text-zinc-500 text-xs">
										WORKSPACE ID
									</span>
									<p className="text-white font-medium">{workspace.id}</p>
								</div>
								<div>
									<span className="text-zinc-500 text-xs">POD NAME</span>
									<p className="text-white font-medium">{workspace.podName}</p>
								</div>
								<div>
									<span className="text-zinc-500 text-xs">STATUS</span>
									<p className="text-emerald-400 font-medium">
										{workspace.status}
									</p>
								</div>
								<div>
									<span className="text-zinc-500 text-xs">
										TEMPLATE VERSION
									</span>
									<p className="text-white font-medium">
										{workspace.templateVersion || "1.0.0"}
									</p>
								</div>
							</div>
						</div>
					)}

					{activeTab === "logs" && (
						<div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-zinc-300 leading-relaxed text-xs overflow-x-auto min-h-[300px]">
							<p className="text-zinc-500">
								[info] Fetching pod logs for {workspace.podName}...
							</p>
							<p className="text-emerald-400">
								[ready] Container startup completed cleanly.
							</p>
						</div>
					)}

					{activeTab === "terminal" && (
						<div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-zinc-300 min-h-[300px] flex items-center justify-center text-zinc-500">
							Terminal iframe connection initialized.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

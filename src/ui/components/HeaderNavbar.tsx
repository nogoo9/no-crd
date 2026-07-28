import React from "react";
import { useApp } from "../context/AppContext.js";
import { ShieldIcon, SparklesIcon } from "./Icons.js";

interface HeaderNavbarProps {
	onUpgradeAll?: () => void;
	isUpgradingAll?: boolean;
	outdatedCount?: number;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
	onUpgradeAll,
	isUpgradingAll,
	outdatedCount = 0,
}) => {
	const { theme, setTheme, capabilities } = useApp();

	return (
		<header className="navbar flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
					N
				</div>
				<span className="font-bold text-lg text-white tracking-tight">
					nogoo9
				</span>
				<span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
					no-crd
				</span>
			</div>

			<div className="flex items-center gap-4">
				{capabilities.isAdmin && outdatedCount > 0 && (
					<button
						type="button"
						onClick={onUpgradeAll}
						disabled={isUpgradingAll}
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
					>
						<SparklesIcon className="w-4 h-4" />
						{isUpgradingAll
							? "Upgrading All..."
							: `Upgrade All Outdated (${outdatedCount})`}
					</button>
				)}

				<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-sm text-zinc-300">
					{capabilities.isAdmin && (
						<ShieldIcon className="w-4 h-4 text-emerald-400" />
					)}
					<span className="font-medium text-zinc-200">
						{capabilities.userSub || "Anonymous"}
					</span>
				</div>

				<select
					value={theme}
					onChange={(e) => setTheme(e.target.value)}
					className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
				>
					<option value="dark">Dark Theme</option>
					<option value="light">Light Theme</option>
				</select>
			</div>
		</header>
	);
};

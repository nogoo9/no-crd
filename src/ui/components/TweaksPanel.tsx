import React from "react";
import { I } from "~/ui/icons.js";

export interface TweaksWidgetPanelProps {
	theme: string;
	density: string;
	accent: string;
	customTheme: string;
	availableThemes: Array<{ id: string; name: string }>;
	open: boolean;
	onThemeChange: (t: string) => void;
	onCustomThemeChange: (ct: string) => void;
	onDensityChange: (d: string) => void;
	onAccentChange: (a: string) => void;
	onClose: () => void;
}

export function TweaksWidgetPanel({
	theme,
	density,
	accent,
	customTheme,
	availableThemes,
	open,
	onThemeChange,
	onCustomThemeChange,
	onDensityChange,
	onAccentChange,
	onClose,
}: TweaksWidgetPanelProps) {
	if (!open) return null;

	const accentsList = [
		{ hex: "#c96442", name: "Terracotta" },
		{ hex: "#2a6fdb", name: "Sapphire" },
		{ hex: "#1f8a5b", name: "Emerald" },
		{ hex: "#7a5ae0", name: "Amethyst" },
	];

	return (
		<div className="fixed right-6 bottom-6 z-50 w-72 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col p-5 space-y-4 animate-pop select-none">
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
				<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Visual Customizer
				</h4>
				<button
					className="btn btn-quiet p-1 rounded hover:bg-[var(--surface)] text-[var(--ink-3)]"
					onClick={onClose}
				>
					<I.cross className="w-4 h-4" />
				</button>
			</div>

			<div className="space-y-1 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
					Color Palette
				</label>
				<select
					value={customTheme}
					onChange={(e) => onCustomThemeChange(e.target.value)}
					className="w-full theme-text-input text-xs px-3 py-2 cursor-pointer outline-none rounded-lg font-bold border border-[var(--line)] h-9 shadow-sm bg-[var(--surface)]"
				>
					{availableThemes.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</select>
			</div>

			<div className="space-y-1 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
					Appearance Mode
				</label>
				<div className="flex gap-2 bg-[var(--surface)] p-1 rounded-lg">
					<button
						onClick={() => onThemeChange("light")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${theme === "light" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Light Mode
					</button>
					<button
						onClick={() => onThemeChange("dark")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${theme === "dark" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Dark Mode
					</button>
				</div>
			</div>

			<div className="space-y-1 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
					Layout Density
				</label>
				<div className="flex gap-2 bg-[var(--surface)] p-1 rounded-lg">
					<button
						onClick={() => onDensityChange("comfortable")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${density === "comfortable" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Comfortable
					</button>
					<button
						onClick={() => onDensityChange("compact")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${density === "compact" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Compact
					</button>
				</div>
			</div>

			<div className="space-y-1.5 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
					Primary Color Accent
				</label>
				<div className="flex gap-2.5">
					{accentsList.map((a) => (
						<button
							key={a.hex}
							onClick={() => onAccentChange(a.hex)}
							className="w-9 h-9 rounded-xl border shadow-xs transition-transform cursor-pointer hover:scale-105 flex items-center justify-center"
							style={{
								backgroundColor: a.hex,
								borderColor: accent === a.hex ? "var(--ink)" : "rgba(0,0,0,0.1)",
							}}
							title={a.name}
						>
							{accent === a.hex && (
								<svg
									className="w-4 h-4 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="3"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

export function MeowEasterEgg() {
	return (
		<div className="meow-ufo-container">
			<style>{`
				.meow-ufo-container {
					position: fixed;
					inset: 0;
					pointer-events: none;
					z-index: 99999;
					display: flex;
					align-items: center;
					justify-content: center;
					overflow: hidden;
					background: transparent;
				}
				.meow-ufo {
					width: 180px;
					height: 180px;
					position: relative;
					animation: meow-ufo-fly 4.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
					filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.45));
				}
				@keyframes meow-ufo-fly {
					0% {
						transform: translate(-100vw, 100vh) scale(0.2) rotate(-35deg);
						opacity: 0;
					}
					25% {
						transform: translate(-20vw, 15vh) scale(0.7) rotate(15deg);
						opacity: 1;
					}
					45% {
						transform: translate(0vw, -5vh) scale(1) rotate(-8deg);
					}
					55% {
						transform: translate(8vw, 2vh) scale(1.1) rotate(5deg);
					}
					65% {
						transform: translate(-5vw, -12vh) scale(1.05) rotate(-10deg);
					}
					80% {
						transform: translate(25vw, -25vh) scale(0.75) rotate(20deg);
						opacity: 1;
					}
					100% {
						transform: translate(100vw, -100vh) scale(0.2) rotate(45deg);
						opacity: 0;
					}
				}
				
				.meow-ufo-beam {
					animation: meow-beam-pulse 0.4s infinite ease-in-out;
					transform-origin: 50% 65%;
				}
				@keyframes meow-beam-pulse {
					0%, 100% { opacity: 0.25; transform: scaleX(0.95); }
					50% { opacity: 0.55; transform: scaleX(1.05); }
				}

				.meow-ufo-light {
					animation: meow-light-flash 0.3s infinite alternate;
				}
				@keyframes meow-light-flash {
					0% { fill: #39ff14; filter: drop-shadow(0 0 1px #39ff14); }
					100% { fill: #106005; filter: none; }
				}

				.meow-char {
					position: absolute;
					font-family: 'Outfit', 'Inter', sans-serif;
					font-weight: 900;
					font-size: 2.2rem;
					color: #eae6da;
					background: #c96442;
					padding: 4px 12px;
					border: 3px solid #1f1e1c;
					border-radius: 12px;
					box-shadow: 0 8px 0 #1f1e1c;
					pointer-events: none;
					opacity: 0;
					text-transform: uppercase;
					white-space: nowrap;
				}

				.meow-char-1 {
					left: 28%;
					top: 55%;
					animation: meow-drop-1 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.8s forwards;
				}
				@keyframes meow-drop-1 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.1) rotate(-15deg); }
					100% { transform: translateY(40vh) scale(1.8) rotate(35deg); opacity: 0; }
				}

				.meow-char-2 {
					left: 42%;
					top: 50%;
					animation: meow-drop-2 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 1.3s forwards;
				}
				@keyframes meow-drop-2 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.2) rotate(20deg); }
					100% { transform: translateY(45vh) scale(1.9) rotate(-40deg); opacity: 0; }
				}

				.meow-char-3 {
					left: 55%;
					top: 48%;
					animation: meow-drop-3 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 1.8s forwards;
				}
				@keyframes meow-drop-3 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.2) rotate(-10deg); }
					100% { transform: translateY(45vh) scale(2) rotate(45deg); opacity: 0; }
				}

				.meow-char-4 {
					left: 48%;
					top: 45%;
					animation: meow-drop-4 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 2.3s forwards;
				}
				@keyframes meow-drop-4 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.3) rotate(25deg); }
					100% { transform: translateY(50vh) scale(2.2) rotate(-30deg); opacity: 0; }
				}

				.meow-char-5 {
					left: 62%;
					top: 38%;
					animation: meow-drop-5 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 2.8s forwards;
				}
				@keyframes meow-drop-5 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.35) rotate(-20deg); }
					100% { transform: translateY(55vh) scale(2.4) rotate(50deg); opacity: 0; }
				}

				.meow-char-6 {
					left: 74%;
					top: 32%;
					animation: meow-drop-6 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) 3.3s forwards;
				}
				@keyframes meow-drop-6 {
					0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
					15% { opacity: 1; transform: scale(1.2) rotate(15deg); }
					100% { transform: translateY(50vh) scale(2.2) rotate(-20deg); opacity: 0; }
				}
			`}</style>

			<div className="meow-ufo">
				<svg viewBox="0 0 100 100" width="100%" height="100%">
					<defs>
						<linearGradient id="beam-grad" x1="0%" y1="0%" x2="0%" y2="100%">
							<stop offset="0%" stopColor="#39ff14" stopOpacity="0.8" />
							<stop offset="100%" stopColor="#39ff14" stopOpacity="0" />
						</linearGradient>
					</defs>

					<polygon
						points="35,66 10,100 90,100 65,66"
						fill="url(#beam-grad)"
						className="meow-ufo-beam"
					/>

					<path
						d="M 22 56 A 28 28 0 0 1 78 56 Z"
						fill="rgba(150, 240, 255, 0.25)"
						stroke="rgba(255, 255, 255, 0.5)"
						strokeWidth="1.5"
					/>

					<polygon
						points="32,32 28,14 44,27"
						fill="#c96442"
						stroke="#c96442"
						strokeWidth="1"
						strokeLinejoin="round"
					/>
					<polygon
						points="68,32 72,14 56,27"
						fill="#c96442"
						stroke="#c96442"
						strokeWidth="1"
						strokeLinejoin="round"
					/>
					<polygon points="33,30 30,17 42,26" fill="#f5d6cc" />
					<polygon points="67,30 70,17 58,26" fill="#f5d6cc" />

					<circle cx="50" cy="40" r="16" fill="#c96442" />

					<circle cx="44" cy="38" r="3" fill="#1f1e1c" />
					<circle cx="56" cy="38" r="3" fill="#1f1e1c" />
					<circle cx="42.5" cy="36.5" r="1" fill="#ffffff" />
					<circle cx="54.5" cy="36.5" r="1" fill="#ffffff" />

					<ellipse cx="50" cy="45" rx="6" ry="4" fill="#eae6da" />
					<polygon points="50,43.5 48,41.5 52,41.5" fill="#1f1e1c" />
					<path
						d="M47,46 C47,48 50,48 50,46 C50,48 53,48 53,46"
						fill="none"
						stroke="#1f1e1c"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>

					<line x1="28" y1="44" x2="16" y2="43" stroke="#1f1e1c" strokeWidth="1" />
					<line x1="28" y1="47" x2="15" y2="47" stroke="#1f1e1c" strokeWidth="1" />
					<line x1="72" y1="44" x2="84" y2="43" stroke="#1f1e1c" strokeWidth="1" />
					<line x1="72" y1="47" x2="85" y2="47" stroke="#1f1e1c" strokeWidth="1" />

					<path
						d="M 22 56 C 22 78, 78 78, 78 56 L 70 51 L 62 56 L 54 49 L 46 56 L 38 49 L 30 56 Z"
						fill="#eae6da"
						stroke="#d5d0c0"
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>

					<circle
						cx="34"
						cy="55"
						r="3.5"
						fill="#eae6da"
						stroke="#1f1e1c"
						strokeWidth="1"
					/>
					<circle
						cx="66"
						cy="55"
						r="3.5"
						fill="#eae6da"
						stroke="#1f1e1c"
						strokeWidth="1"
					/>

					<ellipse
						cx="50"
						cy="65"
						rx="43"
						ry="12"
						fill="#3a3d40"
						stroke="#1f1e1c"
						strokeWidth="1.5"
					/>
					<ellipse cx="50" cy="65" rx="38" ry="8" fill="#585c60" />

					<circle
						cx="16"
						cy="64"
						r="2"
						fill="#39ff14"
						className="meow-ufo-light"
						style={{ animationDelay: "0s" }}
					/>
					<circle
						cx="30"
						cy="68"
						r="2.5"
						fill="#39ff14"
						className="meow-ufo-light"
						style={{ animationDelay: "0.1s" }}
					/>
					<circle
						cx="50"
						cy="70"
						r="3"
						fill="#39ff14"
						className="meow-ufo-light"
						style={{ animationDelay: "0.2s" }}
					/>
					<circle
						cx="70"
						cy="68"
						r="2.5"
						fill="#39ff14"
						className="meow-ufo-light"
						style={{ animationDelay: "0.3s" }}
					/>
					<circle
						cx="84"
						cy="64"
						r="2"
						fill="#39ff14"
						className="meow-ufo-light"
						style={{ animationDelay: "0.4s" }}
					/>
				</svg>
			</div>

			<div className="meow-char meow-char-1">MEOW!</div>
			<div className="meow-char meow-char-2">MEOW</div>
			<div className="meow-char meow-char-3">MEOW~</div>
			<div className="meow-char meow-char-4">MEOW!</div>
			<div className="meow-char meow-char-5">MEOW</div>
			<div className="meow-char meow-char-6">MEOW~</div>
		</div>
	);
}

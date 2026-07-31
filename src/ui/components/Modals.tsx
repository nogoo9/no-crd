import React, { useEffect, useRef, useState } from "react";
import { app } from "~/ui/app.js";
import { I } from "~/ui/icons.js";
import type {
	CreateTemplateModalProps,
	EventsViewModalProps,
	LogsViewModalProps,
	SpawnWorkspaceModalProps,
	SystemInfoModalProps,
	TemplateSpecModalProps,
	TokenSettingsModalProps,
	WorkspacePreviewModalProps,
} from "~/ui/types.js";
import { decodeJwt, generateRandomString, jsonToYaml } from "~/ui/utils.js";

export function TokenSettingsModal({
	activeToken,
	onSave,
	onClear,
	onClose,
}: TokenSettingsModalProps) {
	const [tokenInput, setTokenInput] = useState(activeToken);

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							Authentication Token Settings
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Configure your manual JWT token overrides.
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSave(tokenInput.trim());
					}}
					className="p-6 space-y-4"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							JWT Token Value
						</label>
						<textarea
							value={tokenInput}
							onChange={(e) => setTokenInput(e.target.value)}
							rows={5}
							required
							className="theme-text-input w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none resize-none"
							placeholder="Paste your base64 OIDC JWT token payload..."
						/>
					</div>
					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
						<button
							type="button"
							className="btn btn-ghost text-xs"
							onClick={onClear}
						>
							Clear Token
						</button>
						<button type="submit" className="btn btn-primary text-xs">
							Save Settings
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function SpawnWorkspaceModal({
	template,
	isAdmin,
	existingWorkspaces,
	currentUser,
	onSpawn,
	onClose,
	onMeowTrigger,
}: SpawnWorkspaceModalProps) {
	const [workspaceId, setWorkspaceId] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");
	const [targetUser, setTargetUser] = useState("");
	const [contextVars, setContextVars] = useState<Record<string, string>>({});
	const hasInitializedRef = useRef<string | null>(null);

	useEffect(() => {
		if (hasInitializedRef.current === template.name) {
			return;
		}
		hasInitializedRef.current = template.name;

		const prefix = template.name.toLowerCase().replace(/[^a-z0-9-]/g, "");
		const userPrefix = currentUser
			? `${currentUser.toLowerCase().replace(/[^a-z0-9-]/g, "")}-`
			: "";
		let uniqueId = "";
		let isUnique = false;
		let attempts = 0;
		while (!isUnique && attempts < 100) {
			const randomSuffix = generateRandomString(6).toLowerCase();
			uniqueId = `${userPrefix}${prefix}-${randomSuffix}`;
			isUnique = !existingWorkspaces.some((ws) => ws.id === uniqueId);
			attempts++;
		}
		setWorkspaceId(uniqueId);
		setWorkspaceName(
			`${template.name.charAt(0).toUpperCase() + template.name.slice(1)} Workspace`,
		);

		if (template.requiredContext && template.requiredContext.length > 0) {
			const initialVars: Record<string, string> = {};
			for (const key of template.requiredContext) {
				initialVars[key] = "";
			}
			setContextVars(initialVars);
		} else {
			setContextVars({});
		}
	}, [template, currentUser, existingWorkspaces]);

	const handleWorkspaceNameChange = (val: string) => {
		const prevContains = workspaceName.toLowerCase().includes("meow");
		const nextContains = val.toLowerCase().includes("meow");
		setWorkspaceName(val);
		if (!prevContains && nextContains && onMeowTrigger) {
			onMeowTrigger();
		}
	};

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							Spawn Workspace Sandbox
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Template environment:{" "}
							<span className="font-mono text-[var(--accent)]">
								{template.name}
							</span>
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						const trimmedId = workspaceId.trim();
						if (existingWorkspaces.some((ws) => ws.id === trimmedId)) {
							alert(
								`Workspace ID "${trimmedId}" already exists. Please enter a unique ID.`,
							);
							return;
						}
						onSpawn(trimmedId, workspaceName.trim(), targetUser.trim(), contextVars);
					}}
					className="p-6 space-y-4"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Workspace ID (Unique identifier for routed path)
						</label>
						<input
							type="text"
							value={workspaceId}
							onChange={(e) =>
								setWorkspaceId(
									e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
								)
							}
							required
							className="theme-text-input w-full px-4 py-2.5 text-sm font-mono"
							placeholder="e.g. dev-sandbox-1"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Workspace Display Name (Optional)
						</label>
						<input
							type="text"
							value={workspaceName}
							onChange={(e) => handleWorkspaceNameChange(e.target.value)}
							className="theme-text-input w-full px-4 py-2.5 text-sm"
							placeholder="e.g. Main Node project"
						/>
					</div>

					{isAdmin && (
						<div>
							<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
								Target Owner User ID (Admin Only)
							</label>
							<input
								type="text"
								value={targetUser}
								onChange={(e) => setTargetUser(e.target.value)}
								className="theme-text-input w-full px-4 py-2.5 text-sm font-mono"
								placeholder="e.g. readuser (defaults to self)"
							/>
						</div>
					)}

					{template.requiredContext && template.requiredContext.length > 0 && (
						<div className="space-y-3 mt-4 pt-3 border-t border-[var(--line)]">
							<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
								Required Context Variables
							</label>
							{template.requiredContext.map((key) => (
								<div key={key}>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										{key}
									</label>
									<input
										type="text"
										value={contextVars[key] || ""}
										onChange={(e) =>
											setContextVars((prev) => ({ ...prev, [key]: e.target.value }))
										}
										required
										className="theme-text-input w-full px-3 py-2 text-xs font-mono"
										placeholder={`Enter value for ${key}`}
									/>
								</div>
							))}
						</div>
					)}

					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
						<button
							type="button"
							className="btn btn-ghost text-xs"
							onClick={onClose}
						>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary text-xs">
							Spawn Sandbox
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function CreateTemplateModal({ onSave, onClose }: CreateTemplateModalProps) {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [tag, setTag] = useState("");
	const [specString, setSpecString] = useState(
		JSON.stringify(
			{
				containers: [
					{
						name: "workspace",
						image: "oven/bun:1-alpine",
						command: ["sleep", "infinity"],
					},
				],
			},
			null,
			2,
		),
	);

	const [context, setContext] = useState("");
	const [port, setPort] = useState("");
	const [previewPath, setPreviewPath] = useState("/");
	const [previewType, setPreviewType] = useState("html");
	const [gracePeriod, setGracePeriod] = useState("");
	const [initImage, setInitImage] = useState("");
	const [initCmd, setInitCmd] = useState("");
	const [prestopCmd, setPrestopCmd] = useState("");
	const [prestopSidecar, setPrestopSidecar] = useState("");

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							Register Pod Template Spec
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Create a new reusable sandbox pod ConfigMap template.
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSave(name.trim(), desc.trim(), tag.trim(), specString, {
							context,
							port,
							previewPath,
							previewType,
							gracePeriod,
							initImage,
							initCmd,
							prestopCmd,
							prestopSidecar,
						});
					}}
					className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[70vh] select-text"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Template Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) =>
								setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
							}
							required
							className="theme-text-input w-full px-4 py-2 text-xs font-mono"
							placeholder="e.g. custom-bun-environment"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Description
						</label>
						<input
							type="text"
							value={desc}
							onChange={(e) => setDesc(e.target.value)}
							className="theme-text-input w-full px-4 py-2 text-xs"
							placeholder="Brief description of the development workspace"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Tag
						</label>
						<input
							type="text"
							value={tag}
							onChange={(e) => setTag(e.target.value)}
							className="theme-text-input w-full px-4 py-2 text-xs"
							placeholder="e.g. testing, dev (default)"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
							Pod Spec (JSON)
						</label>
						<textarea
							value={specString}
							onChange={(e) => setSpecString(e.target.value)}
							rows={6}
							required
							className="theme-text-input w-full rounded-xl px-4 py-2 text-xs font-mono outline-none resize-y"
							placeholder="Paste JSON Pod spec..."
						/>
					</div>

					<details className="border border-[var(--line)] rounded-xl overflow-hidden">
						<summary className="list-none flex items-center justify-between p-4 cursor-pointer select-none font-bold text-[11px] text-[var(--ink)] uppercase tracking-wider bg-[var(--surface)]">
							<span>Advanced Annotations & Hooks</span>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</summary>
						<div className="p-4 border-t border-[var(--line)] space-y-4 bg-[var(--sunken)] text-left">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										Required Context
									</label>
									<input
										type="text"
										value={context}
										onChange={(e) => setContext(e.target.value)}
										className="theme-text-input w-full px-3 py-2 text-xs"
										placeholder="e.g. S3_BUCKET,AWS_ACCESS_KEY"
									/>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										Workspace Port
									</label>
									<input
										type="number"
										value={port}
										onChange={(e) => setPort(e.target.value)}
										className="theme-text-input w-full px-3 py-2 text-xs"
										placeholder="e.g. 3000"
									/>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										Preview Path
									</label>
									<input
										type="text"
										value={previewPath}
										onChange={(e) => setPreviewPath(e.target.value)}
										className="theme-text-input w-full px-3 py-2 text-xs"
										placeholder="e.g. /"
									/>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										Preview Type
									</label>
									<select
										value={previewType}
										onChange={(e) => setPreviewType(e.target.value)}
										className="theme-text-input w-full px-3 py-2 text-xs bg-transparent"
									>
										<option value="html">HTML</option>
										<option value="markdown">Markdown</option>
									</select>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
										Grace Period (Seconds)
									</label>
									<input
										type="number"
										value={gracePeriod}
										onChange={(e) => setGracePeriod(e.target.value)}
										className="theme-text-input w-full px-3 py-2 text-xs"
										placeholder="e.g. 30"
									/>
								</div>
							</div>

							<div className="border-t border-[var(--line)] pt-3">
								<h5 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider mb-2">
									Init Container Sync Hook
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
											Init Container Image
										</label>
										<input
											type="text"
											value={initImage}
											onChange={(e) => setInitImage(e.target.value)}
											className="theme-text-input w-full px-3 py-2 text-xs"
											placeholder="e.g. alpine:latest"
										/>
									</div>
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
											Init Container Sync Command
										</label>
										<input
											type="text"
											value={initCmd}
											onChange={(e) => setInitCmd(e.target.value)}
											className="theme-text-input w-full px-3 py-2 text-xs font-mono"
											placeholder="e.g. aws s3 sync"
										/>
									</div>
								</div>
							</div>

							<div className="border-t border-[var(--line)] pt-3">
								<h5 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider mb-2">
									Pre-Stop Lifecycle Sync Hook
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
											Pre-Stop Command
										</label>
										<input
											type="text"
											value={prestopCmd}
											onChange={(e) => setPrestopCmd(e.target.value)}
											className="theme-text-input w-full px-3 py-2 text-xs font-mono"
											placeholder="e.g. run sync back script"
										/>
									</div>
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">
											Pre-Stop Sidecar Image
										</label>
										<input
											type="text"
											value={prestopSidecar}
											onChange={(e) => setPrestopSidecar(e.target.value)}
											className="theme-text-input w-full px-3 py-2 text-xs"
											placeholder="e.g. aws-cli image"
										/>
									</div>
								</div>
							</div>
						</div>
					</details>

					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
						<button
							type="button"
							className="btn btn-ghost text-xs"
							onClick={onClose}
						>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary text-xs">
							Register Template
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function TemplateSpecModal({
	template,
	namespace,
	onClose,
}: TemplateSpecModalProps) {
	const [specJson, setSpecJson] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"details" | "yaml" | "spec">("details");

	useEffect(() => {
		const loadSpec = async () => {
			try {
				setLoading(true);
				const res = await app.callServerTool({
					name: "get_template",
					arguments: { name: template.name, namespace },
				});
				if (res && !res.isError && res.structuredContent) {
					setSpecJson(res.structuredContent);
				}
			} catch (_) {
			} finally {
				setLoading(false);
			}
		};
		void loadSpec();
	}, [template]);

	let nogooAnnotations: Record<string, string> = {};
	let otherAnnotations: Record<string, string> = {};
	let nogooLabels: Record<string, string> = {};
	let otherLabels: Record<string, string> = {};

	if (specJson) {
		const annotations = specJson.annotations || {};
		for (const [k, v] of Object.entries(annotations)) {
			if (k.startsWith("nogoo9/") || k.includes("nogoo9")) {
				nogooAnnotations[k] = String(v);
			} else {
				otherAnnotations[k] = String(v);
			}
		}

		const labels = specJson.labels || {};
		for (const [k, v] of Object.entries(labels)) {
			if (k.startsWith("nogoo9/") || k.includes("nogoo9")) {
				nogooLabels[k] = String(v);
			} else {
				otherLabels[k] = String(v);
			}
		}
	}

	let yamlContent = "";
	if (specJson) {
		const configMapObject = {
			apiVersion: "v1",
			kind: "ConfigMap",
			metadata: {
				name: specJson.name || template.name,
				namespace: specJson.namespace || namespace,
				labels: specJson.labels || {},
				annotations: specJson.annotations || {},
			},
			data: {
				spec: JSON.stringify(specJson.spec || {}, null, 2),
			},
		};
		yamlContent = jsonToYaml(configMapObject).trim();
	}

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-extrabold text-[var(--ink)]">
								Template Specification
							</h3>
							{specJson?.version && (
								<span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] rounded-full border border-[var(--line)]">
									v{specJson.version}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							ConfigMap reference:{" "}
							<span className="font-mono text-[var(--accent)]">
								{template.name}
							</span>
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>

				{!loading && specJson && (
					<div className="px-6 py-2.5 bg-[var(--sunken)] border-b border-[var(--line)] flex items-center shrink-0">
						<div className="flex gap-1 bg-[var(--card)] p-1 rounded-xl border border-[var(--line)]">
							<button
								onClick={() => setActiveTab("details")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "details" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								Structured Details
							</button>
							<button
								onClick={() => setActiveTab("yaml")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "yaml" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								ConfigMap YAML
							</button>
							<button
								onClick={() => setActiveTab("spec")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "spec" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								Pod Spec JSON
							</button>
						</div>
					</div>
				)}

				<div className="p-6 overflow-y-auto flex-1 select-text text-left space-y-6">
					{loading ? (
						<div className="text-xs text-[var(--ink-3)] font-mono flex items-center gap-2">
							<I.refresh className="w-4 h-4 animate-spin text-[var(--accent)]" />
							Loading template specification...
						</div>
					) : specJson ? (
						<>
							{activeTab === "details" && (
								<>
									{specJson.description && (
										<div className="space-y-1 bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)]">
											<h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
												Description
											</h4>
											<p className="text-xs text-[var(--ink-2)] font-medium leading-relaxed">
												{specJson.description}
											</p>
										</div>
									)}

									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.settings className="w-3.5 h-3.5" /> nogoo9 Labels
										</h4>
										{Object.keys(nogooLabels).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(nogooLabels).map(([k, v]) => (
													<div
														key={k}
														className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0"
													>
														<span className="text-[9px] text-[var(--ink-3)] break-all">
															{k}
														</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">
															{String(v)}
														</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">
												No nogoo9 labels defined
											</div>
										)}
									</div>

									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.settings className="w-3.5 h-3.5" /> nogoo9 Annotations
										</h4>
										{Object.keys(nogooAnnotations).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(nogooAnnotations).map(([k, v]) => (
													<div
														key={k}
														className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0"
													>
														<span className="text-[9px] text-[var(--ink-3)] break-all">
															{k}
														</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">
															{String(v)}
														</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">
												No nogoo9 annotations defined
											</div>
										)}
									</div>

									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.info className="w-3.5 h-3.5" /> Kubernetes System Labels
										</h4>
										{Object.keys(otherLabels).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(otherLabels).map(([k, v]) => (
													<div
														key={k}
														className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0"
													>
														<span className="text-[9px] text-[var(--ink-3)] break-all">
															{k}
														</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">
															{String(v)}
														</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">
												No system labels defined
											</div>
										)}
									</div>

									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.info className="w-3.5 h-3.5" /> Kubernetes System Annotations
										</h4>
										{Object.keys(otherAnnotations).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(otherAnnotations).map(([k, v]) => (
													<div
														key={k}
														className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0"
													>
														<span className="text-[9px] text-[var(--ink-3)] break-all">
															{k}
														</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">
															{String(v)}
														</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">
												No system annotations defined
											</div>
										)}
									</div>
								</>
							)}

							{activeTab === "yaml" && (
								<div className="space-y-2.5">
									<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
										<I.settings className="w-3.5 h-3.5" /> ConfigMap YAML Manifest
									</h4>
									<pre className="p-4 bg-[var(--sunken)] rounded-xl font-mono text-[11px] overflow-x-auto text-[var(--ink)] border border-[var(--line)] select-text leading-relaxed max-h-[420px]">
										{yamlContent}
									</pre>
								</div>
							)}

							{activeTab === "spec" && (specJson.spec || specJson.podSpec) && (
								<div className="space-y-2.5">
									<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5">
										Pod Specification Spec (JSON)
									</h4>
									<pre className="p-4 bg-[var(--sunken)] rounded-xl font-mono text-[11px] overflow-x-auto text-[var(--ink)] border border-[var(--line)] select-text leading-relaxed max-h-[420px]">
										{JSON.stringify(specJson.spec || specJson.podSpec, null, 2)}
									</pre>
								</div>
							)}
						</>
					) : (
						<div className="text-xs text-red-500 font-mono">
							Failed to fetch template spec details.
						</div>
					)}
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export function LogsViewModal({
	workspace,
	logs,
	onRefresh,
	onClose,
}: LogsViewModalProps) {
	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							Container Log Output
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Pod reference:{" "}
							<span className="font-mono text-[var(--accent)]">
								{workspace.podName || workspace.id}
							</span>
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 select-text text-left">
					<pre className="p-5 font-mono text-xs text-neutral-300 bg-neutral-900 rounded-xl min-h-[350px] overflow-x-auto select-text leading-relaxed">
						{logs}
					</pre>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onRefresh}>
						Refresh Logs
					</button>
					<button className="btn btn-ghost text-xs" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export function EventsViewModal({
	workspace,
	events,
	onRefresh,
	onClose,
}: EventsViewModalProps) {
	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							K8s Namespace Lifecycle Events
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Workspace selector:{" "}
							<span className="font-mono text-[var(--accent)]">{workspace.id}</span>
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 select-text text-left">
					<pre className="p-5 font-mono text-xs text-[var(--ink-2)] bg-[var(--sunken)] border border-[var(--line)] rounded-xl min-h-[350px] overflow-x-auto select-text leading-relaxed">
						{Array.isArray(events)
							? events
									.map(
										(ev: any) =>
											`[${ev.lastTimestamp || ev.firstTimestamp}] ${ev.type} - ${ev.reason}: ${ev.message}`,
									)
									.join("\n")
							: events}
					</pre>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onRefresh}>
						Refresh Events
					</button>
					<button className="btn btn-ghost text-xs" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export function SystemInfoModal({
	capabilities,
	namespace,
	activeToken,
	basePath,
	onClose,
}: SystemInfoModalProps) {
	const decoded = activeToken ? decodeJwt(activeToken) : null;
	const clientName = "nogoo9-pod-manager";
	const clientVersion = "0.8.1";

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">
							Model Context Protocol System Metadata
						</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">
							Server capabilities and active sandbox configurations.
						</p>
					</div>
					<button
						className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]"
						onClick={onClose}
					>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 space-y-6 text-left select-text">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
								UI Client
							</span>
							<span className="text-sm font-semibold text-[var(--ink)] block">
								{clientName}
							</span>
							<span className="text-xs font-mono text-[var(--ink-3)] block mt-0.5">
								Version: {clientVersion}
							</span>
						</div>
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
								no-crd Backend
							</span>
							<span className="text-sm font-semibold text-[var(--ink)] block">
								@nogoo9/no-crd
							</span>
							<span className="text-xs font-mono text-[var(--ink-3)] block mt-0.5">
								Version: {capabilities.version || "0.8.1"}
							</span>
						</div>
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
								Host base path
							</span>
							<span className="text-sm font-mono font-semibold text-[var(--ink)] block">
								{basePath || "/"}
							</span>
							<span className="text-xs text-[var(--ink-3)] block mt-0.5">
								Custom subpath routing prefix
							</span>
						</div>
					</div>

					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">
							Features & Access Flags
						</h4>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
									Access Mode
								</span>
								<span
									className={`px-2 py-0.5 text-[10px] rounded-full font-bold inline-block ${capabilities.isAdmin ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}
								>
									{capabilities.isAdmin ? "ADMIN" : "STANDARD"}
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
									Auth Gate
								</span>
								<span
									className={`px-2 py-0.5 text-[10px] rounded-full font-bold inline-block ${capabilities.authEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--ink-3)]/10 text-[var(--ink-3)]"}`}
								>
									{capabilities.authEnabled ? "ACTIVE" : "INACTIVE"}
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
									Scope Guard
								</span>
								<span className="px-2 py-0.5 text-[10px] rounded-full font-bold inline-block bg-emerald-500/10 text-emerald-500">
									ENABLED
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">
									Pod Visibility
								</span>
								<span className="px-2 py-0.5 text-[10px] text-[var(--ink)] bg-[var(--sunken)] border border-[var(--line)] rounded-full font-bold inline-block">
									{capabilities.managedOnly ? "MANAGED ONLY" : "ALL CLUSTER"}
								</span>
							</div>
						</div>
					</div>

					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">
							Registered MCP Tools ({capabilities.enabledTools.length})
						</h4>
						<div className="flex flex-wrap gap-2">
							{capabilities.enabledTools.length > 0 ? (
								capabilities.enabledTools.map((tool) => (
									<span
										key={tool}
										className="px-2.5 py-1 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]"
									>
										{tool}
									</span>
								))
							) : (
								<span className="text-xs text-[var(--ink-3)] font-mono">
									No tools enabled.
								</span>
							)}
						</div>
					</div>

					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">
							User SSO Identity (JWT Claims)
						</h4>
						{decoded ? (
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--sunken)] space-y-3 font-mono text-xs text-[var(--ink-2)]">
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">
										Subject (ID):
									</span>
									<span className="col-span-2 text-[var(--ink)] break-all">
										{decoded.sub || decoded.custom_user_id || "N/A"}
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">Username:</span>
									<span className="col-span-2 text-[var(--ink)]">
										{decoded.preferred_username || decoded.name || "N/A"}
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">
										Roles / Scopes:
									</span>
									<span className="col-span-2 text-[var(--ink)] whitespace-pre-wrap break-all">
										{JSON.stringify(
											decoded.custom_roles ||
												decoded.roles ||
												decoded.scope ||
												"N/A",
										)}
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2 pb-1">
									<span className="font-bold text-[var(--ink-3)]">
										Expiration:
									</span>
									<span className="col-span-2 text-[var(--ink)]">
										{decoded.exp
											? new Date(decoded.exp * 1000).toLocaleString()
											: "Never"}
									</span>
								</div>
							</div>
						) : (
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-center">
								<p className="text-xs text-[var(--ink-3)] font-mono">
									No active JWT authentication token. Runs in no-auth/unrestricted mode.
								</p>
							</div>
						)}
					</div>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export function WorkspacePreviewModal({
	workspace,
	path,
	type,
	basePath,
	activeToken,
	onClose,
}: WorkspacePreviewModalProps) {
	const [isMaximized, setIsMaximized] = useState(() => {
		const stored = localStorage.getItem("nocr_inline_maximized");
		return stored !== "false";
	});
	const [isHeaderOpen, setIsHeaderOpen] = useState(true);
	const [refreshKey, setRefreshKey] = useState(0);

	const tokenQuery = activeToken
		? `?token=${encodeURIComponent(activeToken)}`
		: "";
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	const targetUrl = `${basePath}/route/${workspace.id}${cleanPath}${tokenQuery}`;
	const tabUrl = `${basePath}/route/${workspace.id}${cleanPath}`;

	const handleRefresh = () => {
		setRefreshKey((prev) => prev + 1);
	};

	const toggleMaximize = () => {
		const next = !isMaximized;
		setIsMaximized(next);
		localStorage.setItem("nocr_inline_maximized", String(next));
	};

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-0 md:p-4">
			<div
				className={`theme-modal bg-[var(--sunken)] overflow-hidden flex flex-col animate-pop transition-all relative ${isMaximized ? "fixed inset-0 w-screen h-screen rounded-none border-0" : "w-full max-w-6xl rounded-2xl h-[92vh] border border-[var(--line)] shadow-2xl"}`}
			>
				<div
					className={`absolute top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform ${isHeaderOpen ? "translate-y-0" : "-translate-y-full"}`}
				>
					<div
						className="border border-t-0 border-[var(--line)] px-6 py-2.5 rounded-b-2xl shadow-2xl flex flex-col items-center gap-1.5 shrink-0"
						style={{
							backgroundColor:
								"color-mix(in srgb, var(--card) 85%, transparent)",
							backdropFilter: "blur(12px)",
							WebkitBackdropFilter: "blur(12px)",
						}}
					>
						<div className="flex items-center gap-5">
							<div className="flex flex-col pr-4 border-r border-[var(--line)] text-left">
								<span className="text-[11px] font-extrabold text-[var(--ink)] whitespace-nowrap">
									Inline App Preview
								</span>
								<span className="text-[9px] font-mono text-[var(--accent)] whitespace-nowrap">
									{workspace.id}
								</span>
							</div>

							<div className="flex items-center gap-1.5">
								<button
									onClick={handleRefresh}
									className="btn btn-ghost px-2.5 py-1 text-[11px] flex items-center gap-1.5"
									title="Refresh Application"
								>
									<I.refresh className="w-3.5 h-3.5" />
									Refresh
								</button>

								<a
									href={tabUrl}
									target="_blank"
									className="btn btn-ghost px-2.5 py-1 text-[11px] flex items-center gap-1.5"
									title="Open in New Tab"
									rel="noreferrer"
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

								<button
									onClick={toggleMaximize}
									className="btn btn-ghost px-2.5 py-1 text-[11px] flex items-center gap-1.5"
									title={isMaximized ? "Restore Size" : "Maximize"}
								>
									{isMaximized ? (
										<>
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
													d="M19 9h-4V5m0 4l5-5M5 15h4v4m0-4l-5 5m14 0h4v-4m-4 4l5 5M9 5v4H5m4-4L4 4"
												/>
											</svg>
											Restore
										</>
									) : (
										<>
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
													d="M4 14h6v6m0-6l-6 6m16-6h-6V8m0 6l6-6M4 4h6v6m0-6L4 10m16-6h-6v6m0-6l6 6"
												/>
											</svg>
											Maximize
										</>
									)}
								</button>

								<button
									className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)] hover:text-red-500 flex items-center justify-center"
									onClick={onClose}
									title="Close Preview"
								>
									<I.cross className="w-4 h-4" />
								</button>
							</div>
						</div>

						<button
							onClick={() => setIsHeaderOpen(false)}
							className="text-[9px] text-[var(--ink-3)] hover:text-[var(--accent)] flex items-center gap-0.5 select-none cursor-pointer border-none bg-transparent font-semibold mt-0.5 transition-colors"
						>
							<span>Collapse Panel</span>
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
									d="M5 15l7-7 7 7"
								/>
							</svg>
						</button>
					</div>
				</div>

				<div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
					<button
						onClick={() => setIsHeaderOpen(true)}
						className={`border border-[var(--line)] border-t-0 px-4 py-1.5 rounded-b-xl shadow-md flex items-center gap-1 text-[10px] text-[var(--ink-2)] transition-all cursor-pointer select-none font-extrabold ${isHeaderOpen ? "opacity-0 pointer-events-none -translate-y-full" : "opacity-100 translate-y-0"}`}
						style={{
							backgroundColor:
								"color-mix(in srgb, var(--card) 85%, transparent)",
							backdropFilter: "blur(8px)",
							WebkitBackdropFilter: "blur(8px)",
						}}
					>
						<span>Show Control Panel</span>
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
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
				</div>

				<div className="flex-1 bg-white relative w-full h-full">
					<iframe
						key={refreshKey}
						src={targetUrl}
						className="w-full h-full border-none absolute inset-0 bg-white"
						sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
						title={`Preview frame of ${workspace.id}`}
					/>
				</div>
			</div>
		</div>
	);
}

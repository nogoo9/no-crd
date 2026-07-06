import { z } from "zod";

export const WorkspaceApiSchema = z.object({
	name: z.string(),
	port: z.string(),
	path: z.string(),
	desc: z.string().optional(),
	method: z.string().optional(),
	refresh: z.string().optional(),
});

export const ListWorkspacesOutputSchema = z.object({
	workspaces: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			status: z.string(),
			templateRef: z.string().optional(),
			apis: z.array(WorkspaceApiSchema).optional(),
			podName: z.string().optional(),
			templateVersion: z.string().optional(),
			latestTemplateVersion: z.string().optional(),
			isOutdated: z.boolean().optional(),
			owner: z.string().optional(),
			userSub: z.string().optional(),
			creationTime: z.string().optional(),
			description: z.string().optional(),
			annotations: z.record(z.string(), z.string()).optional(),
		}),
	),
});

export const StopWorkspaceOutputSchema = z.object({
	id: z.string(),
	status: z.string(),
});

export const SpawnWorkspaceOutputSchema = z.object({
	id: z.string(),
	podName: z.string(),
});

export const GetWorkspaceOutputSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.string(),
	podIP: z.string(),
	port: z.string(),
	workspacePath: z.string(),
	workspaceType: z.string(),
	previewPath: z.string().optional(),
	previewType: z.string().optional(),
	userSub: z.string(),
	annotations: z.record(z.string(), z.string()),
	labels: z.record(z.string(), z.string()).optional(),
	templateRef: z.string().optional(),
	apis: z.array(WorkspaceApiSchema).optional(),
	spec: z.record(z.string(), z.unknown()).optional(),
	pod: z.record(z.string(), z.unknown()).optional(),
	podName: z.string().optional(),
	templateVersion: z.string().optional(),
	latestTemplateVersion: z.string().optional(),
	isOutdated: z.boolean().optional(),
	owner: z.string().optional(),
	creationTime: z.string().optional(),
	description: z.string().optional(),
});

export const GetWorkspaceEventsOutputSchema = z.object({
	events: z.array(
		z.object({
			type: z.string(),
			reason: z.string(),
			message: z.string(),
			timestamp: z.string(),
		}),
	),
});

export const UpgradeWorkspaceOutputSchema = z.object({
	id: z.string(),
	status: z.string(),
	podName: z.string().optional(),
});

export const UpgradeAllWorkspacesOutputSchema = z.object({
	upgraded: z.array(z.string()),
	failed: z.array(
		z.object({
			id: z.string(),
			error: z.string(),
		}),
	),
	upgradedPods: z
		.array(
			z.object({
				id: z.string(),
				podName: z.string(),
			}),
		)
		.optional(),
});

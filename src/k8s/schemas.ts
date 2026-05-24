import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const EnvVar = z
	.object({
		name: z.string(),
		value: z.string().optional(),
		valueFrom: z
			.object({
				fieldRef: z
					.object({
						fieldPath: z.string(),
						apiVersion: z.string().optional(),
					})
					.optional(),
				resourceFieldRef: z
					.object({
						resource: z.string(),
						containerName: z.string().optional(),
						divisor: z.string().optional(),
					})
					.optional(),
				configMapKeyRef: z
					.object({
						name: z.string(),
						key: z.string(),
						optional: z.boolean().optional(),
					})
					.optional(),
				secretKeyRef: z
					.object({
						name: z.string(),
						key: z.string(),
						optional: z.boolean().optional(),
					})
					.optional(),
			})
			.optional(),
	})
	.passthrough();

export const EnvFromSource = z
	.object({
		prefix: z.string().optional(),
		configMapRef: z
			.object({ name: z.string(), optional: z.boolean().optional() })
			.optional(),
		secretRef: z
			.object({ name: z.string(), optional: z.boolean().optional() })
			.optional(),
	})
	.passthrough();

export const ResourceQuantity = z
	.record(z.string(), z.string())
	.describe('e.g. {"cpu":"500m","memory":"128Mi"}');

const Probe = z
	.object({
		exec: z.object({ command: z.array(z.string()) }).optional(),
		httpGet: z
			.object({
				path: z.string(),
				port: z.union([z.number().int(), z.string()]),
				scheme: z.enum(["HTTP", "HTTPS"]).optional(),
				httpHeaders: z
					.array(z.object({ name: z.string(), value: z.string() }))
					.optional(),
			})
			.optional(),
		tcpSocket: z
			.object({ port: z.union([z.number().int(), z.string()]) })
			.optional(),
		grpc: z
			.object({ port: z.number().int(), service: z.string().optional() })
			.optional(),
		initialDelaySeconds: z.number().int().optional(),
		periodSeconds: z.number().int().optional(),
		timeoutSeconds: z.number().int().optional(),
		successThreshold: z.number().int().optional(),
		failureThreshold: z.number().int().optional(),
		terminationGracePeriodSeconds: z.number().int().optional(),
	})
	.passthrough();

const ContainerSecurityContext = z
	.object({
		runAsUser: z.number().int().optional(),
		runAsGroup: z.number().int().optional(),
		runAsNonRoot: z.boolean().optional(),
		readOnlyRootFilesystem: z.boolean().optional(),
		allowPrivilegeEscalation: z.boolean().optional(),
		privileged: z.boolean().optional(),
		capabilities: z
			.object({
				add: z.array(z.string()).optional(),
				drop: z.array(z.string()).optional(),
			})
			.optional(),
		seccompProfile: z
			.object({
				type: z.enum(["Unconfined", "RuntimeDefault", "Localhost"]),
				localhostProfile: z.string().optional(),
			})
			.optional(),
	})
	.passthrough();

export const Container = z
	.object({
		name: z.string(),
		image: z.string(),
		command: z.array(z.string()).optional(),
		args: z.array(z.string()).optional(),
		workingDir: z.string().optional(),
		env: z.array(EnvVar).optional(),
		envFrom: z.array(EnvFromSource).optional(),
		ports: z
			.array(
				z.object({
					containerPort: z.number().int(),
					name: z.string().optional(),
					protocol: z.enum(["TCP", "UDP", "SCTP"]).optional(),
					hostPort: z.number().int().optional(),
					hostIP: z.string().optional(),
				}),
			)
			.optional(),
		resources: z
			.object({
				limits: ResourceQuantity.optional(),
				requests: ResourceQuantity.optional(),
			})
			.optional(),
		volumeMounts: z
			.array(
				z.object({
					name: z.string(),
					mountPath: z.string(),
					subPath: z.string().optional(),
					subPathExpr: z.string().optional(),
					readOnly: z.boolean().optional(),
					mountPropagation: z
						.enum(["None", "HostToContainer", "Bidirectional"])
						.optional(),
				}),
			)
			.optional(),
		imagePullPolicy: z.enum(["Always", "Never", "IfNotPresent"]).optional(),
		securityContext: ContainerSecurityContext.optional(),
		livenessProbe: Probe.optional(),
		readinessProbe: Probe.optional(),
		startupProbe: Probe.optional(),
		lifecycle: z
			.object({
				postStart: z
					.object({
						exec: z.object({ command: z.array(z.string()) }).optional(),
						httpGet: z
							.object({
								path: z.string(),
								port: z.union([z.number().int(), z.string()]),
								scheme: z.enum(["HTTP", "HTTPS"]).optional(),
							})
							.optional(),
					})
					.optional(),
				preStop: z
					.object({
						exec: z.object({ command: z.array(z.string()) }).optional(),
						httpGet: z
							.object({
								path: z.string(),
								port: z.union([z.number().int(), z.string()]),
								scheme: z.enum(["HTTP", "HTTPS"]).optional(),
							})
							.optional(),
						sleep: z.object({ seconds: z.number().int() }).optional(),
					})
					.optional(),
			})
			.optional(),
		terminationMessagePath: z.string().optional(),
		terminationMessagePolicy: z
			.enum(["File", "FallbackToLogsOnError"])
			.optional(),
		stdin: z.boolean().optional(),
		tty: z.boolean().optional(),
	})
	.passthrough();

export const Volume = z
	.object({
		name: z.string(),
		emptyDir: z
			.object({
				medium: z.string().optional(),
				sizeLimit: z.string().optional(),
			})
			.optional(),
		configMap: z
			.object({
				name: z.string(),
				items: z
					.array(
						z.object({
							key: z.string(),
							path: z.string(),
							mode: z.number().int().optional(),
						}),
					)
					.optional(),
				defaultMode: z.number().int().optional(),
				optional: z.boolean().optional(),
			})
			.optional(),
		secret: z
			.object({
				secretName: z.string(),
				items: z
					.array(
						z.object({
							key: z.string(),
							path: z.string(),
							mode: z.number().int().optional(),
						}),
					)
					.optional(),
				defaultMode: z.number().int().optional(),
				optional: z.boolean().optional(),
			})
			.optional(),
		persistentVolumeClaim: z
			.object({
				claimName: z.string(),
				readOnly: z.boolean().optional(),
			})
			.optional(),
		hostPath: z
			.object({
				path: z.string(),
				type: z
					.enum([
						"",
						"DirectoryOrCreate",
						"Directory",
						"FileOrCreate",
						"File",
						"Socket",
						"CharDevice",
						"BlockDevice",
					])
					.optional(),
			})
			.optional(),
		projected: z
			.object({
				defaultMode: z.number().int().optional(),
				sources: z
					.array(
						z.object({
							configMap: z
								.object({
									name: z.string(),
									items: z
										.array(
											z.object({
												key: z.string(),
												path: z.string(),
											}),
										)
										.optional(),
								})
								.optional(),
							secret: z
								.object({
									name: z.string(),
									items: z
										.array(
											z.object({
												key: z.string(),
												path: z.string(),
											}),
										)
										.optional(),
								})
								.optional(),
							serviceAccountToken: z
								.object({
									path: z.string(),
									audience: z.string().optional(),
									expirationSeconds: z.number().int().optional(),
								})
								.optional(),
						}),
					)
					.optional(),
			})
			.optional(),
		nfs: z
			.object({
				server: z.string(),
				path: z.string(),
				readOnly: z.boolean().optional(),
			})
			.optional(),
		csi: z
			.object({
				driver: z.string(),
				readOnly: z.boolean().optional(),
				fsType: z.string().optional(),
				volumeAttributes: z.record(z.string(), z.string()).optional(),
				nodePublishSecretRef: z.object({ name: z.string() }).optional(),
			})
			.optional(),
	})
	.passthrough();

const PodSecurityContext = z
	.object({
		runAsUser: z.number().int().optional(),
		runAsGroup: z.number().int().optional(),
		fsGroup: z.number().int().optional(),
		fsGroupChangePolicy: z.enum(["OnRootMismatch", "Always"]).optional(),
		runAsNonRoot: z.boolean().optional(),
		supplementalGroups: z.array(z.number().int()).optional(),
		sysctls: z
			.array(z.object({ name: z.string(), value: z.string() }))
			.optional(),
		seccompProfile: z
			.object({
				type: z.enum(["Unconfined", "RuntimeDefault", "Localhost"]),
				localhostProfile: z.string().optional(),
			})
			.optional(),
		seLinuxOptions: z
			.object({
				level: z.string().optional(),
				role: z.string().optional(),
				type: z.string().optional(),
				user: z.string().optional(),
			})
			.optional(),
	})
	.passthrough();

const Toleration = z
	.object({
		key: z.string().optional(),
		operator: z.enum(["Exists", "Equal"]).optional(),
		value: z.string().optional(),
		effect: z.enum(["NoSchedule", "PreferNoSchedule", "NoExecute"]).optional(),
		tolerationSeconds: z.number().int().optional(),
	})
	.passthrough();

const LabelSelector = z
	.object({
		matchLabels: z.record(z.string(), z.string()).optional(),
		matchExpressions: z
			.array(
				z.object({
					key: z.string(),
					operator: z.enum(["In", "NotIn", "Exists", "DoesNotExist"]),
					values: z.array(z.string()).optional(),
				}),
			)
			.optional(),
	})
	.passthrough();

const NodeSelectorRequirement = z
	.object({
		key: z.string(),
		operator: z.enum(["In", "NotIn", "Exists", "DoesNotExist", "Gt", "Lt"]),
		values: z.array(z.string()).optional(),
	})
	.passthrough();

const AffinityTerm = z
	.object({
		labelSelector: LabelSelector.optional(),
		topologyKey: z.string(),
		namespaces: z.array(z.string()).optional(),
		namespaceSelector: LabelSelector.optional(),
	})
	.passthrough();

const Affinity = z
	.object({
		nodeAffinity: z
			.object({
				requiredDuringSchedulingIgnoredDuringExecution: z
					.object({
						nodeSelectorTerms: z.array(
							z.object({
								matchExpressions: z.array(NodeSelectorRequirement).optional(),
								matchFields: z.array(NodeSelectorRequirement).optional(),
							}),
						),
					})
					.optional(),
				preferredDuringSchedulingIgnoredDuringExecution: z
					.array(
						z.object({
							weight: z.number().int(),
							preference: z.object({
								matchExpressions: z.array(NodeSelectorRequirement).optional(),
								matchFields: z.array(NodeSelectorRequirement).optional(),
							}),
						}),
					)
					.optional(),
			})
			.optional(),
		podAffinity: z
			.object({
				requiredDuringSchedulingIgnoredDuringExecution: z
					.array(AffinityTerm)
					.optional(),
				preferredDuringSchedulingIgnoredDuringExecution: z
					.array(
						z.object({
							weight: z.number().int(),
							podAffinityTerm: AffinityTerm,
						}),
					)
					.optional(),
			})
			.optional(),
		podAntiAffinity: z
			.object({
				requiredDuringSchedulingIgnoredDuringExecution: z
					.array(AffinityTerm)
					.optional(),
				preferredDuringSchedulingIgnoredDuringExecution: z
					.array(
						z.object({
							weight: z.number().int(),
							podAffinityTerm: AffinityTerm,
						}),
					)
					.optional(),
			})
			.optional(),
	})
	.passthrough();

export const PodSpecSchema = z
	.object({
		labels: z
			.record(z.string(), z.string())
			.optional()
			.describe("Metadata labels"),
		annotations: z
			.record(z.string(), z.string())
			.optional()
			.describe("Metadata annotations"),
		containers: z
			.array(Container)
			.min(1)
			.describe("Pod containers (at least one required)"),
		initContainers: z.array(Container).optional(),
		volumes: z.array(Volume).optional(),
		restartPolicy: z
			.enum(["Always", "OnFailure", "Never"])
			.optional()
			.describe("Defaults to Always"),
		serviceAccountName: z.string().optional(),
		automountServiceAccountToken: z.boolean().optional(),
		nodeSelector: z.record(z.string(), z.string()).optional(),
		nodeName: z.string().optional(),
		hostNetwork: z.boolean().optional(),
		hostPID: z.boolean().optional(),
		hostIPC: z.boolean().optional(),
		dnsPolicy: z
			.enum(["ClusterFirst", "ClusterFirstWithHostNet", "Default", "None"])
			.optional(),
		imagePullSecrets: z.array(z.object({ name: z.string() })).optional(),
		securityContext: PodSecurityContext.optional(),
		tolerations: z.array(Toleration).optional(),
		affinity: Affinity.optional(),
		topologySpreadConstraints: z
			.array(
				z.object({
					maxSkew: z.number().int(),
					topologyKey: z.string(),
					whenUnsatisfiable: z.enum(["DoNotSchedule", "ScheduleAnyway"]),
					labelSelector: LabelSelector.optional(),
					minDomains: z.number().int().optional(),
				}),
			)
			.optional(),
		priorityClassName: z.string().optional(),
		priority: z.number().int().optional(),
		runtimeClassName: z.string().optional(),
		terminationGracePeriodSeconds: z.number().int().nonnegative().optional(),
		activeDeadlineSeconds: z.number().int().positive().optional(),
	})
	.passthrough();

export type PodCreateArgs = z.infer<typeof PodSpecSchema>;

export interface ConfigParam {
	cli: string;
	env: string;
	defaultVal: string;
	allowed: string;
	description: string;
}

export interface ConfigGroup {
	title: string;
	emoji: string;
	params: ConfigParam[];
}

export interface AnnotationParam {
	key: string;
	type: string;
	description: string;
}

export interface SchemaItem<T> {
	cli: string;
	env: string | string[];
	defaultVal: T;
	allowed?: readonly any[] | string;
	description: string;
	readonly value: T;
}

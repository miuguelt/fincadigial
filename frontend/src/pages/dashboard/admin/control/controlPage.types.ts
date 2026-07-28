export type ControlPageTab = "today" | "milk" | "health" | "corral";

export type ControlModalKey =
	| "milk"
	| "weight"
	| "health"
	| "transfer"
	| "corral";

export interface ControlOption {
	value: number;
	label: string;
}

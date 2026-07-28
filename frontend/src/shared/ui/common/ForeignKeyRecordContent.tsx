import { Calendar, Database, ExternalLink, Info, Tag } from "lucide-react";
import type React from "react";
import { BaseService } from "@/shared/api/base-service";
import {
	type ForeignKeyReference,
	getForeignKeyReference,
	getRelatedRecordLabel,
} from "@/shared/lib/foreignKeyReferences";
import type {
	ForeignKeyField,
	ForeignKeyStackEntry,
} from "./ForeignKeyDetailStack";
import { useForeignKeyDetailStack } from "./ForeignKeyDetailStack";

const services = new Map<string, BaseService<any>>();
type DetailEntry = {
	key: string;
	label: string;
	value: unknown;
	render?: ForeignKeyField["render"];
};

function getService(endpoint: string): BaseService<any> {
	const cached = services.get(endpoint);
	if (cached) return cached;
	const service = new BaseService(endpoint);
	services.set(endpoint, service);
	return service;
}

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === "";
}

function formatValue(key: string, value: unknown): string {
	if (isEmpty(value)) return "-";
	if (typeof value === "boolean") return value ? "Sí" : "No";
	if (key.includes("date") || key.includes("fecha") || key.endsWith("_at")) {
		const date = new Date(String(value));
		if (!Number.isNaN(date.getTime())) return date.toLocaleString("es-CO");
	}
	return String(value);
}

function getIcon(key: string): React.ReactNode {
	if (key.includes("date") || key.includes("fecha") || key.endsWith("_at")) {
		return <Calendar className="h-4 w-4" />;
	}
	if (key.endsWith("_id") || key.endsWith("id")) {
		return <Database className="h-4 w-4" />;
	}
	if (key.includes("status") || key.includes("estado")) {
		return <Info className="h-4 w-4" />;
	}
	return <Tag className="h-4 w-4" />;
}

function openRelation(
	data: Record<string, unknown>,
	value: unknown,
	reference: ForeignKeyReference,
	open: (entry: ForeignKeyStackEntry) => void,
): void {
	if (isEmpty(value) || typeof value === "object") return;
	open({
		id: String(value),
		label: getRelatedRecordLabel(data, reference, String(value)),
		service: getService(reference.endpoint),
		modalTitle: reference.title,
	});
}

export interface ForeignKeyRecordContentProps {
	data: Record<string, unknown>;
	openReference: (entry: ForeignKeyStackEntry) => void;
	fields?: ForeignKeyField[];
	className?: string;
}

export function ForeignKeyRecordContent({
	data,
	openReference,
	fields,
	className = "",
}: ForeignKeyRecordContentProps) {
	const stack = useForeignKeyDetailStack();
	const open = stack?.open ?? openReference;
	const entries: DetailEntry[] = fields
		? fields.map((field) => ({
				key: field.key,
				label: field.label,
				value: data[field.key],
				render: field.render,
			}))
		: Object.entries(data).map(([key, value]) => ({
				key,
				label: key.replace(/_/g, " "),
				value,
			}));

	return (
		<div className={`space-y-4 ${className}`}>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{entries
					.filter(
						({ key, value }) =>
							!key.startsWith("_") && typeof value !== "object",
					)
					.map(({ key, label, value, render }) => {
						const reference = getForeignKeyReference(key);
						const valueText = reference
							? getRelatedRecordLabel(data, reference, String(value))
							: formatValue(key, value);
						const renderedValue = render ? render(value, data) : null;
						return (
							<div
								key={key}
								className="min-w-0 rounded-xl border border-border/40 bg-muted/20 p-3"
							>
								<div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									{getIcon(key)}
									<span>{label}</span>
								</div>
								{renderedValue !== null && renderedValue !== undefined ? (
									<p className="break-words text-sm font-semibold text-foreground">
										{renderedValue}
									</p>
								) : reference && !isEmpty(value) ? (
									<button
										type="button"
										onClick={(event) => {
											event.stopPropagation();
											openRelation(data, value, reference, open);
										}}
										className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-left text-sm font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
										aria-label={`Ver ${reference.title.toLowerCase()}`}
									>
										<span className="truncate">{valueText}</span>
										<ExternalLink className="h-3.5 w-3.5 shrink-0" />
									</button>
								) : (
									<p className="break-words text-sm font-semibold text-foreground">
										{valueText}
									</p>
								)}
							</div>
						);
					})}
			</div>
		</div>
	);
}

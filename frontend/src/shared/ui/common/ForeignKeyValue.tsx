import type React from "react";
import { useMemo } from "react";
import { BaseService } from "@/shared/api/base-service";
import {
	getForeignKeyReference,
	getRelatedRecordLabel,
} from "@/shared/lib/foreignKeyReferences";
import { ForeignKeyLink } from "./ForeignKeyLink";

interface ForeignKeyValueProps {
	fieldName: string;
	id: number | string | null | undefined;
	label: string;
	className?: string;
}

const services = new Map<string, BaseService<any>>();

function getService(endpoint: string): BaseService<any> {
	const cached = services.get(endpoint);
	if (cached) return cached;
	const service = new BaseService(endpoint);
	services.set(endpoint, service);
	return service;
}

export const ForeignKeyValue: React.FC<ForeignKeyValueProps> = ({
	fieldName,
	id,
	label,
	className,
}) => {
	const reference = getForeignKeyReference(fieldName);
	const endpoint = reference?.endpoint;
	const service = useMemo(
		() => (endpoint ? getService(endpoint) : null),
		[endpoint],
	);

	if (
		!reference ||
		service === null ||
		id === null ||
		id === undefined ||
		id === ""
	) {
		return <>{label || "-"}</>;
	}
	const normalizedLabel = String(label || "").trim();
	const displayLabel =
		normalizedLabel && normalizedLabel !== String(id) && normalizedLabel !== "-"
			? normalizedLabel
			: getRelatedRecordLabel({}, reference, id);

	return (
		<ForeignKeyLink
			id={id}
			label={displayLabel}
			service={service}
			modalTitle={reference.title}
			className={className}
		/>
	);
};

import type React from "react";
import { createContext, useContext } from "react";

export interface ForeignKeyField {
	key: string;
	label: string;
	render?: (value: any, item: Record<string, unknown>) => React.ReactNode;
}

export interface ForeignKeyStackEntry {
	id: number | string;
	label: string;
	service: {
		getById: (id: number | string) => Promise<any>;
	};
	modalTitle: string;
	renderContent?: (
		data: any,
		helpers?: ForeignKeyStackHelpers,
	) => React.ReactNode;
	fields?: ForeignKeyField[];
	size?:
		| "sm"
		| "md"
		| "lg"
		| "xl"
		| "2xl"
		| "3xl"
		| "4xl"
		| "5xl"
		| "6xl"
		| "7xl"
		| "full";
	enableFullScreenToggle?: boolean;
}

export interface ForeignKeyStackHelpers {
	closeModal: () => void;
	reload: () => Promise<void>;
	setData: (data: any) => void;
}

export interface ForeignKeyDetailStackContextValue {
	open: (entry: ForeignKeyStackEntry) => void;
	close: () => void;
	closeAll: () => void;
	depth: number;
}

export const ForeignKeyDetailStackContext = createContext<
	ForeignKeyDetailStackContextValue | undefined
>(undefined);

export function useForeignKeyDetailStack():
	| ForeignKeyDetailStackContextValue
	| undefined {
	return useContext(ForeignKeyDetailStackContext);
}

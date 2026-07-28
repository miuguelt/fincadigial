import type { UserResponse } from "@/shared/api/generated/swaggerTypes";

export type UserFormInput = {
	identification: number | string;
	fullname: string;
	first_name?: string;
	last_name?: string;
	email: string;
	phone?: string;
	address?: string;
	role:
		| "Administrador"
		| "Propietario"
		| "Capataz"
		| "Instructor"
		| "Veterinario"
		| "Aprendiz"
		| "Operario";
	password?: string;
	status?: boolean;
	is_active?: boolean;
	approval_status?: "Pending" | "Approved" | "Rejected" | "Suspended";
};

export type UserWithProfile = UserResponse & {
	[k: string]: any;
	avatar_url?: string | null;
	finca_type?: string | null;
	fincas?: Array<{
		id?: number;
		finca_id?: number;
		name?: string;
		finca_name?: string;
		type?: string | null;
		finca_type?: string | null;
		role?: string;
		is_active?: boolean;
		is_primary?: boolean;
		created_at?: string;
	}>;
};

import { User as UserIcon } from "lucide-react";
import type { UserResponse } from "@/shared/api/generated/swaggerTypes";
import type {
	CRUDColumn,
	CRUDConfig,
	CRUDFormSection,
} from "@/shared/types/crud";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/ui/cn";
import type { UserFormInput } from "../types";

export const columns: CRUDColumn<UserResponse & { [k: string]: any }>[] = [
	{
		key: "fullname",
		label: "Persona",
		render: (v, item) => (
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm border border-primary/20">
					{item.avatar_url ? (
						<img
							src={item.avatar_url}
							alt={v}
							className="w-full h-full object-cover"
						/>
					) : (
						v?.[0] || <UserIcon size={14} />
					)}
				</div>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-foreground truncate">{v}</span>
					<span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
						{item.role}
					</span>
				</div>
			</div>
		),
	},
	{ key: "identification", label: "Cédula / Código", width: 32 },
	{ key: "email", label: "Correo Electrónico" },
	{ key: "phone", label: "Teléfono", render: (v: any) => v || "-", width: 28 },
	{
		key: "approval_status",
		label: "Acceso",
		width: 28,
		render: (v: any) => {
			const statusMap = {
				Pending: {
					label: "Esperando",
					color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
				},
				Approved: {
					label: "Permitido",
					color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
				},
				Rejected: {
					label: "Negado",
					color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
				},
				Suspended: {
					label: "Suspendido",
					color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
				},
			};
			const s = statusMap[v as keyof typeof statusMap] || {
				label: v,
				color: "",
			};
			return (
				<Badge
					variant="outline"
					className={cn("text-[10px] font-black uppercase py-0.5", s.color)}
				>
					{s.label}
				</Badge>
			);
		},
	},
	{
		key: "status",
		label: "En Finca",
		width: 24,
		render: (v: any) => (
			<div className="flex items-center gap-1.5">
				<div
					className={cn(
						"h-1.5 w-1.5 rounded-full",
						v ? "bg-success animate-pulse" : "bg-muted",
					)}
				/>
				<span className="text-xs font-medium">{v ? "Activo" : "Inactivo"}</span>
			</div>
		),
	},
	{
		key: "created_at",
		label: "Desde",
		width: 28,
		render: (v: any) =>
			v ? new Date(v as string).toLocaleDateString("es-ES") : "-",
	},
];

export const formSections: CRUDFormSection<UserFormInput>[] = [
	{
		title: "Información de la Persona",
		gridCols: 2,
		fields: [
			{
				name: "identification",
				label: "Cédula / Identificación",
				type: "text",
				required: true,
				placeholder: "Ej: 123456789",
			},
			{
				name: "fullname",
				label: "Nombre completo",
				type: "text",
				required: true,
				placeholder: "Ej: Juan Pérez",
			},
			{
				name: "email",
				label: "Correo electrónico",
				type: "text",
				required: true,
				placeholder: "usuario@dominio.com",
			},
			{
				name: "role",
				label: "Puesto / Cargo",
				type: "select",
				required: true,
				options: [
					{ value: "Administrador", label: "Administrador" },
					{ value: "Propietario", label: "Propietario" },
					{ value: "Capataz", label: "Capataz" },
					{ value: "Instructor", label: "Instructor" },
					{ value: "Veterinario", label: "Veterinario" },
					{ value: "Aprendiz", label: "Aprendiz" },
					{ value: "Operario", label: "Operario" },
				],
			},
			{
				name: "approval_status",
				label: "Permiso de Acceso",
				type: "select",
				required: true,
				options: [
					{ value: "Pending", label: "⏳ Por revisar" },
					{ value: "Approved", label: "✅ Permitir" },
					{ value: "Rejected", label: "❌ Negar" },
					{ value: "Suspended", label: "🚫 Suspender" },
				],
			},
			{
				name: "password",
				label: "Clave de entrada",
				type: "text",
				placeholder: "Poner solo si se va a cambiar",
			},
			{
				name: "status",
				label: "Está trabajando actualmente",
				type: "checkbox",
			},
		],
	},
	{
		title: "Cómo contactarlo",
		gridCols: 2,
		fields: [
			{
				name: "phone",
				label: "Número de teléfono",
				type: "text",
				required: true,
				placeholder: "Ej: 300 123 4567",
			},
			{
				name: "address",
				label: "Vereda / Dirección",
				type: "text",
				placeholder: "Ej: Vereda El Centro",
			},
		],
	},
];

export const crudConfig: CRUDConfig<
	UserResponse & { [k: string]: any },
	UserFormInput
> = {
	title: "Personas de la Finca",
	entityName: "Persona",
	columns,
	formSections,
	searchPlaceholder: "Buscar por nombre o cédula...",
	emptyStateMessage: "Todavía no hay personas registradas",
	emptyStateDescription:
		"Agregue a los trabajadores o aprendices que laboran en su finca.",
	emptyStateIcon: "IconUsersGroup",
	enableDetailModal: true,
	enableCreateModal: true,
	enableEditModal: true,
	enableDelete: true,
};

export const mapResponseToForm = (
	item: UserResponse & { [k: string]: any },
): UserFormInput => ({
	identification: item.identification,
	fullname: item.fullname || "",
	first_name: item.first_name || "",
	last_name: item.last_name || "",
	email: item.email || "",
	phone: item.phone || "",
	address: item.address || "",
	role: item.role,
	status: typeof item.status === "boolean" ? item.status : item.is_active,
	is_active: item.is_active,
	approval_status: item.approval_status,
});

export const validateForm = (formData: UserFormInput): string | null => {
	if (!String(formData.identification || "").trim())
		return "⚠️ La cédula es obligatoria.";
	if (!formData.fullname || formData.fullname.trim().length < 3)
		return "⚠️ El nombre completo es obligatorio.";
	if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
		return "⚠️ Ingrese un correo válido.";
	if (!formData.phone || formData.phone.trim().length < 7)
		return "⚠️ El teléfono es obligatorio.";
	return null;
};

export const initialFormData: UserFormInput = {
	identification: "",
	fullname: "",
	email: "",
	role: "Operario",
	approval_status: "Pending",
	password: "",
	status: true,
	phone: "",
	address: "",
};

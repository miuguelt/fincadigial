import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { UserResponse } from "@/shared/api/generated/swaggerTypes";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import {
	IconBuildingFarm,
	IconCalendar,
	IconCheck,
	IconIdBadge2,
	IconLoader2,
	IconMail,
	IconPhone,
	IconX,
} from "@/shared/ui/icons";
import { TableCell, TableRow } from "@/shared/ui/table";

interface UserRowProps {
	user: UserResponse;
	actionLoading: number | null;
	isRemoving: boolean;
	onApprove: (id: number) => void;
	onReject: (id: number) => void;
}

const AVATAR_COLORS = [
	"bg-emerald-500",
	"bg-blue-500",
	"bg-violet-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-cyan-500",
	"bg-indigo-500",
	"bg-pink-500",
];

function getAvatarColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();
}

export function UserRow({
	user,
	actionLoading,
	isRemoving,
	onApprove,
	onReject,
}: UserRowProps) {
	const isBusy = actionLoading === user.id;
	const [imgError, setImgError] = useState(false);
	const showAvatar = (user as any).avatar_url && !imgError;

	return (
		<TableRow
			className={cn(
				"group hover:bg-success/5/30 transition-colors",
				isRemoving && "animate-item-deleting",
			)}
		>
			<TableCell>
				<div className="flex items-center gap-3">
					{showAvatar ? (
						<img
							src={(user as any).avatar_url}
							alt={user.fullname}
							onError={() => setImgError(true)}
							className="h-10 w-10 shrink-0 rounded-full object-cover border-2 border-success/20"
						/>
					) : (
						<div
							className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${getAvatarColor(user.fullname)}`}
						>
							{getInitials(user.fullname)}
						</div>
					)}
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-foreground fit-clamp">
							{user.fullname}
						</span>
						<div className="flex items-center gap-3 mt-1 flex-wrap">
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<IconIdBadge2 size={12} /> {user.identification}
							</span>
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<IconMail size={12} /> {user.email}
							</span>
							{user.phone && (
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									<IconPhone size={12} /> {user.phone}
								</span>
							)}
						</div>
						{user.finca_name && (
							<div className="flex items-center gap-1 mt-1">
								<IconBuildingFarm size={12} className="text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									{user.finca_name}
								</span>
							</div>
						)}
					</div>
				</div>
			</TableCell>
			<TableCell>
				<Badge
					variant="secondary"
					className="bg-info/5 text-info border-blue-100"
				>
					{user.role}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<IconCalendar size={14} />
					{user.created_at
						? format(new Date(user.created_at), "d 'de' MMMM, yyyy", {
								locale: es,
							})
						: "—"}
				</div>
			</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						onClick={() => onApprove(user.id)}
						disabled={isBusy || isRemoving}
						className="bg-success hover:bg-green-700 h-9 w-9 p-0 rounded-full shadow-sm transition-all"
						title="Aprobar usuario"
					>
						{isBusy ? (
							<IconLoader2 size={14} className="animate-spin" />
						) : (
							<IconCheck size={14} />
						)}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onReject(user.id)}
						disabled={isBusy || isRemoving}
						className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0 rounded-full transition-all"
						title="Rechazar usuario"
					>
						<IconX size={14} />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

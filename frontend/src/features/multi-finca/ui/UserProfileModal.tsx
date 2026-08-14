import { Mail, MapPin, Phone } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useCallback } from "react";
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { usersService } from "@/entities/user/api/user.service";
import { Card } from "@/shared/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/ui/dialog";
import { IconLoader2, IconUser } from "@/shared/ui/icons";
import { devLogger } from "@/shared/utils/devLogger";

interface UserProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	userId?: number;
	userName?: string;
	userEmail?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
	isOpen,
	onClose,
	userId,
	userName,
	userEmail,
}) => {
	const [loading, setLoading] = useState(false);
	const [userData, setUserData] = useState<any>(null);

	const fetchUserData = useCallback(async () => {
		setLoading(true);
		try {
			let fetchedUser: any = null;
			if (userId) {
				try {
					fetchedUser = await usersService.getUserById(userId);
				} catch (e) {
					devLogger.error("Error al obtener datos del usuario:", e);
					setLoading(false);
					return;
				}
			}

			if (!fetchedUser) {
				setLoading(false);
				return;
			}

			const realAnimalsCount =
				fetchedUser?.fincas?.reduce(
					(acc: number, f: any) => acc + (f.animals_count || 0),
					0,
				) || 0;

			const finalUserData = {
				fullname: fetchedUser?.fullname || userName || "Usuario",
				email: fetchedUser?.email || userEmail || "Sin correo",
				identification: fetchedUser?.identification || "No registrado",
				phone: fetchedUser?.phone || "No registrado",
				address: fetchedUser?.address || "No registrada",
				fincas_count: fetchedUser?.fincas?.length || 0,
				animals_count: realAnimalsCount,
				join_date: fetchedUser?.created_at
					? new Date(fetchedUser.created_at).toLocaleDateString('es-CO')
					: "No disponible",
				role_suggested: fetchedUser?.role || "Operario",
			};

			setUserData(finalUserData);
			setLoading(false);
		} catch (error) {
			devLogger.error(error);
			setLoading(false);
		}
	}, [userEmail, userId, userName]);

	useEffect(() => {
		if (isOpen && userId) {
			fetchUserData();
		}
	}, [fetchUserData, isOpen, userId]);

	const chartData = userData
		? [
				{ name: "Fincas", cantidad: userData.fincas_count, fill: "#0284c7" },
				{ name: "Animales", cantidad: userData.animals_count, fill: "#16a34a" },
			]
		: [];

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				fullWidth
				className="max-h-[92dvh] overflow-y-auto bg-white p-0 dark:bg-background sm:h-[92dvh]"
			>
				{loading ? (
					<div className="flex flex-col items-center justify-center p-12 gap-4">
						<IconLoader2 className="animate-spin text-primary w-10 h-10" />
						<p className="text-muted-foreground font-bold">
							Cargando perfil...
						</p>
					</div>
				) : (
					<div className="flex flex-col h-full">
						{/* Header / Avatar */}
						<div className="bg-primary/10 p-8 flex items-center gap-6">
							<div className="w-24 h-24 rounded-full bg-white shadow-xl shadow-primary/20 flex items-center justify-center border-4 border-white overflow-hidden text-primary shrink-0">
								<IconUser size={48} className="opacity-80" />
							</div>
							<div>
								<DialogTitle className="text-3xl font-black text-foreground mb-1">
									{userData?.fullname}
								</DialogTitle>
								<DialogDescription className="text-base text-muted-foreground font-medium flex items-center gap-2 flex-wrap">
									<span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
										{userData?.role_suggested}
									</span>
									<span>•</span>
									<span>Miembro desde {userData?.join_date}</span>
								</DialogDescription>
							</div>
						</div>

						{/* Bento Grid Content */}
						<div className="p-6 bg-muted/5 space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* Datos Personales */}
								<Card className="col-span-1 p-4 bg-card rounded-xl border border-border flex flex-col justify-between space-y-3">
									<h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
										Datos Personales
									</h4>
									<div className="space-y-2.5 text-sm">
										<div className="space-y-0.5">
											<p className="text-[10px] font-bold text-muted-foreground uppercase">
												Identificación
											</p>
											<p className="font-semibold text-foreground">
												{userData?.identification}
											</p>
										</div>
										<div className="space-y-0.5 border-t border-border/40 pt-1.5">
											<p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
												<Mail size={10} /> Correo
											</p>
											<p
												className="font-semibold text-foreground fit-clamp"
												title={userData?.email}
											>
												{userData?.email}
											</p>
										</div>
										<div className="space-y-0.5 border-t border-border/40 pt-1.5">
											<p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
												<Phone size={10} /> Teléfono
											</p>
											<p className="font-semibold text-foreground">
												{userData?.phone}
											</p>
										</div>
										<div className="space-y-0.5 border-t border-border/40 pt-1.5">
											<p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
												<MapPin size={10} /> Ubicación
											</p>
											<p className="font-semibold text-foreground leading-tight">
												{userData?.address}
											</p>
										</div>
									</div>
								</Card>

								{/* Estadísticas de Capacidad */}
								<Card className="col-span-1 md:col-span-2 p-4 bg-card rounded-xl border border-border flex flex-col justify-between">
									<h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
										Capacidad Operativa
									</h4>
									<div className="h-36 w-full">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={chartData}
												layout="vertical"
												margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
											>
												<XAxis
													type="number"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "10px" }}
												/>
												<YAxis
													dataKey="name"
													type="category"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "11px", fontWeight: "bold" }}
												/>
												<Tooltip
													contentStyle={{
														borderRadius: "8px",
														border: "1px solid rgba(229, 231, 235, 0.8)",
														fontSize: "11px",
													}}
												/>
												<Bar
													dataKey="cantidad"
													name="Cantidad"
													radius={[0, 4, 4, 0]}
													barSize={16}
												>
													{chartData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.fill} />
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								</Card>
							</div>

							{/* Sin logros simulados */}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

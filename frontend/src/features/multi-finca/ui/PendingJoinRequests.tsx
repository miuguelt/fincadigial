import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { IconUserPlus } from "@/shared/ui/icons";

interface PendingJoinRequest {
	id: number;
	sender_name?: string;
	finca_name?: string;
}

interface PendingJoinRequestsProps {
	requests: PendingJoinRequest[];
	onApprove: (id: number) => void;
	onReject: (id: number) => void;
}

export const PendingJoinRequests: React.FC<PendingJoinRequestsProps> = ({
	requests,
	onApprove,
	onReject,
}) => {
	if (requests.length === 0) return null;

	return (
		<section className="mb-12">
			<h2 className="mb-6 text-2xl font-black">Solicitudes pendientes</h2>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				<AnimatePresence>
					{requests.map((request, index) => (
						<motion.div
							key={request.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ delay: index * 0.08 }}
						>
							<Card className="h-full rounded-3xl border-primary/20 bg-primary/5">
								<CardContent className="flex h-full flex-col gap-5 p-5">
									<div className="flex items-center gap-3">
										<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
											<IconUserPlus size={21} />
										</div>
										<div className="min-w-0">
											<h3 className="fit-clamp font-bold text-foreground">
												{request.sender_name || "Usuario"}
											</h3>
											<p className="fit-clamp text-sm text-muted-foreground">
												quiere unirse a {request.finca_name || "la finca"}
											</p>
										</div>
									</div>
									<div className="mt-auto flex gap-3">
										<Button
											onClick={() => onApprove(request.id)}
											className="flex-1 rounded-xl font-bold"
										>
											Aprobar
										</Button>
										<Button
											variant="outline"
											onClick={() => onReject(request.id)}
											className="flex-1 rounded-xl font-bold text-danger"
										>
											Rechazar
										</Button>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</section>
	);
};

export default PendingJoinRequests;

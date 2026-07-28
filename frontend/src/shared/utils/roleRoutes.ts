/** Prefijo de ruta del dashboard según el rol del usuario. */
export function getRolePrefix(role?: string): string {
	switch (role) {
		case "Administrador":
		case "Propietario":
		case "Capataz":
			return "/admin";
		case "Instructor":
			return "/instructor";
		case "Veterinario":
			return "/veterinario";
		case "Aprendiz":
			return "/apprentice";
		case "Operario":
			return "/operario";
		default:
			return "/admin";
	}
}

/**
 * Logger condicional — solo emite en desarrollo.
 * console.warn/error se omiten en producción a menos que se use devLogger.warn/error.
 */

const isDev = (): boolean => {
	try {
		return process.env.NODE_ENV === "development";
	} catch {
		return false;
	}
};

export const devLogger = {
	log: (...args: any[]) => {
		if (isDev()) console.log(...args);
	},
	warn: (...args: any[]) => {
		if (isDev()) console.warn(...args);
	},
	error: (...args: any[]) => {
		console.error(...args);
	},
};

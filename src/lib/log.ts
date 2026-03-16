type LogContext = Record<string, unknown>;

function asErrorInfo(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack ?? "Stack trace unavailable",
		};
	}

	return {
		name: undefined,
		message: String(error),
		stack: "Stack trace unavailable",
	};
}

export function logError(scope: string, message: string, context?: LogContext) {
	const error = context?.error;
	const errorInfo = asErrorInfo(error);

	console.error(`❌ [${scope}] ${message}`, {
		...context,
		...errorInfo,
		error,
	});
}

export function logWarn(scope: string, message: string, context?: LogContext) {
	const suffix =
		context && Object.keys(context).length > 0
			? ` ${JSON.stringify(context)}`
			: "";
	console.warn(`⚠️ [${scope}] ${message}${suffix}`);
}

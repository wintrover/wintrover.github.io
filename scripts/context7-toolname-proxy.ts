import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const TOOL_NAME_MAP = new Map([
	["resolve-library-id", "resolve_library_id"],
	["query-docs", "query_docs"],
]);

const TOOL_NAME_MAP_REVERSE = new Map(
	Array.from(TOOL_NAME_MAP.entries()).map(([original, aliased]) => [
		aliased,
		original,
	]),
);

let upstream = null;
let upstreamRequestId = 1;
const upstreamPending = new Map();
let upstreamStdoutBuffer = Buffer.alloc(0);
let upstreamInitialized = false;
let upstreamInitializingPromise = null;
let upstreamReady = false;
let upstreamReadyPromise = null;
let resolveUpstreamReady = null;
let upstreamFraming = "content-length";
let upstreamProcessGeneration = 0;
let activeUpstreamProcessGeneration = 0;
let upstreamToolNames = new Set();
let downstreamFraming = "content-length";
const UPSTREAM_REQUEST_TIMEOUT_MS = 45000;
const UPSTREAM_READY_WAIT_TIMEOUT_MS = 15000;

function toPendingKey(id) {
	return String(id);
}

function log(event, details = {}) {
	const payload = {
		ts: new Date().toISOString(),
		event,
		...details,
	};
	process.stderr.write(`[context7-proxy] ${JSON.stringify(payload)}\n`);
}

function writeMessage(stream, payload) {
	const body = Buffer.from(JSON.stringify(payload), "utf8");
	const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
	stream.write(Buffer.concat([header, body]));
}

function writeUpstreamMessage(stream, payload) {
	if (upstreamFraming === "ndjson") {
		stream.write(`${JSON.stringify(payload)}\n`);
		return;
	}
	writeMessage(stream, payload);
}

function writeDownstreamMessage(stream, payload) {
	if (downstreamFraming === "ndjson") {
		stream.write(`${JSON.stringify(payload)}\n`);
		return;
	}
	writeMessage(stream, payload);
}

function parseMessages(buffer, onMessage, options = {}) {
	const tolerateLeadingNoise = options.tolerateLeadingNoise === true;
	const allowNdjson = options.allowNdjson === true;
	const source = options.source ?? "unknown";
	let cursor = 0;

	while (cursor < buffer.length) {
		if (allowNdjson) {
			const markerIndex = buffer.indexOf("Content-Length:", cursor, "utf8");
			const lineEnd = buffer.indexOf("\n", cursor);
			if (lineEnd !== -1 && (markerIndex === -1 || lineEnd < markerIndex)) {
				const lineRaw = buffer.toString("utf8", cursor, lineEnd);
				cursor = lineEnd + 1;
				const line = lineRaw.trim();
				if (!line) {
					continue;
				}
				try {
					onMessage(JSON.parse(line), "ndjson");
				} catch (error) {
					log("parse.ndjson_line_ignored", {
						source,
						message: error instanceof Error ? error.message : String(error),
						linePreview: line.slice(0, 200),
					});
				}
				continue;
			}
		}

		if (tolerateLeadingNoise) {
			const markerIndex = buffer.indexOf("Content-Length:", cursor, "utf8");
			if (markerIndex === -1) {
				break;
			}
			if (markerIndex > cursor) {
				const preview = buffer
					.toString("utf8", cursor, Math.min(markerIndex, cursor + 200))
					.trim();
				log("parse.noise_discarded", {
					source,
					bytes: markerIndex - cursor,
					preview,
				});
				cursor = markerIndex;
			}
		}

		const headerEnd = buffer.indexOf("\r\n\r\n", cursor, "utf8");
		if (headerEnd === -1) {
			break;
		}

		const headerText = buffer.toString("utf8", cursor, headerEnd);
		const headers = headerText.split("\r\n");
		let contentLength = null;
		for (const header of headers) {
			const [key, value] = header.split(":");
			if (key?.toLowerCase() === "content-length") {
				contentLength = Number(value.trim());
				break;
			}
		}

		if (!Number.isFinite(contentLength) || contentLength < 0) {
			if (tolerateLeadingNoise) {
				log("parse.invalid_header_block", {
					source,
					headerPreview: headerText.slice(0, 200),
				});
				cursor = headerEnd + 4;
				continue;
			}
			throw new Error("Invalid Content-Length header");
		}

		const bodyStart = headerEnd + 4;
		const bodyEnd = bodyStart + contentLength;
		if (bodyEnd > buffer.length) {
			break;
		}

		const bodyText = buffer.toString("utf8", bodyStart, bodyEnd);
		try {
			onMessage(JSON.parse(bodyText), "content-length");
		} catch (error) {
			log("parse.message_error", {
				source,
				message: error instanceof Error ? error.message : String(error),
				bodyPreview: bodyText.slice(0, 200),
			});
			throw error;
		}
		cursor = bodyEnd;
	}

	const remainder = buffer.subarray(cursor);
	if (tolerateLeadingNoise && remainder.length > 4096) {
		log("parse.remainder_trimmed", {
			source,
			oldBytes: remainder.length,
			keptBytes: 1024,
		});
		return remainder.subarray(remainder.length - 1024);
	}
	return remainder;
}

function ensureUpstream() {
	if (upstream) {
		return upstream;
	}

	const env = { ...process.env };
	const { child, strategy } = spawnUpstreamProcess(env);
	const generation = ++upstreamProcessGeneration;
	activeUpstreamProcessGeneration = generation;
	upstreamFraming = process.platform === "win32" ? "ndjson" : "content-length";
	upstreamReady = false;
	upstreamReadyPromise = new Promise((resolve) => {
		resolveUpstreamReady = resolve;
	});

	log("upstream.spawned", {
		pid: child.pid ?? null,
		platform: process.platform,
		strategy,
		framing: upstreamFraming,
	});

	child.stdout.on("data", (chunk) => {
		upstreamStdoutBuffer = Buffer.concat([upstreamStdoutBuffer, chunk]);
		upstreamStdoutBuffer = parseMessages(
			upstreamStdoutBuffer,
			(message) => {
				if (typeof message?.id !== "undefined") {
					const pendingKey = toPendingKey(message.id);
					if (!upstreamPending.has(pendingKey)) {
						log("upstream.response_unmatched", {
							id: message.id,
						});
						return;
					}
					const pending = upstreamPending.get(pendingKey);
					upstreamPending.delete(pendingKey);
					pending.resolve(message);
				}
			},
			{
				tolerateLeadingNoise: true,
				allowNdjson: true,
				source: "upstream.stdout",
			},
		);
	});

	child.stderr.on("data", (chunk) => {
		if (generation !== activeUpstreamProcessGeneration) {
			return;
		}
		const stderrText = chunk.toString("utf8");
		process.stderr.write(chunk);
		log("upstream.stderr", { message: stderrText.trim() });
		if (
			!upstreamReady &&
			stderrText.toLowerCase().includes("running on stdio")
		) {
			upstreamReady = true;
			if (resolveUpstreamReady) {
				resolveUpstreamReady();
				resolveUpstreamReady = null;
			}
			log("upstream.ready_detected");
		}
	});

	child.on("error", (error) => {
		if (generation !== activeUpstreamProcessGeneration) {
			return;
		}
		log("upstream.error", {
			message: error instanceof Error ? error.message : String(error),
		});
	});

	child.on("exit", (code) => {
		if (generation !== activeUpstreamProcessGeneration) {
			log("upstream.exit_ignored", {
				code: code ?? null,
				generation,
			});
			return;
		}
		log("upstream.exit", { code: code ?? null });
		for (const pending of upstreamPending.values()) {
			pending.reject(
				new Error(`Context7 upstream exited (code: ${code ?? "unknown"})`),
			);
		}
		upstreamPending.clear();
		upstream = null;
		upstreamInitialized = false;
		upstreamInitializingPromise = null;
		upstreamReady = false;
		upstreamReadyPromise = null;
		resolveUpstreamReady = null;
		upstreamToolNames = new Set();
	});

	upstream = child;
	return child;
}

async function waitForUpstreamReady() {
	if (upstreamReady) {
		return;
	}
	if (!upstreamReadyPromise) {
		return;
	}
	let timeoutHandle = null;
	try {
		await Promise.race([
			upstreamReadyPromise,
			new Promise((resolve) => {
				timeoutHandle = setTimeout(resolve, UPSTREAM_READY_WAIT_TIMEOUT_MS);
			}),
		]);
	} finally {
		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
		}
	}
	if (!upstreamReady) {
		log("upstream.ready_wait_timeout", {
			timeoutMs: UPSTREAM_READY_WAIT_TIMEOUT_MS,
		});
	}
}

function spawnUpstreamProcess(env) {
	if (process.platform !== "win32") {
		return {
			child: spawn("npx", ["-y", "@upstash/context7-mcp@latest"], {
				stdio: ["pipe", "pipe", "pipe"],
				env,
			}),
			strategy: "npx",
		};
	}

	const nodeDir = dirname(process.execPath);
	const npmCliCandidates = [
		join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
		"C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
	];
	const npmCliPath = npmCliCandidates.find((candidate) =>
		existsSync(candidate),
	);

	const winStrategies = [
		...(npmCliPath
			? [
					{
						name: "node_npm_cli_exec",
						command: process.execPath,
						args: [npmCliPath, "exec", "--yes", "@upstash/context7-mcp@latest"],
					},
				]
			: []),
		{
			name: "npx.cmd",
			command: "npx.cmd",
			args: ["-y", "@upstash/context7-mcp@latest"],
		},
		{
			name: "comspec_npx",
			command: env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
			args: ["/d", "/s", "/c", "npx -y @upstash/context7-mcp@latest"],
		},
	];

	let lastError = null;
	for (const strategy of winStrategies) {
		try {
			return {
				child: spawn(strategy.command, strategy.args, {
					stdio: ["pipe", "pipe", "pipe"],
					env,
				}),
				strategy: strategy.name,
			};
		} catch (error) {
			lastError = error;
			log("upstream.spawn_strategy_failed", {
				strategy: strategy.name,
				command: strategy.command,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	throw lastError ?? new Error("No upstream spawn strategy succeeded");
}

function sendUpstreamRequestRaw(method, params) {
	const child = ensureUpstream();
	return new Promise((resolve, reject) => {
		const id = upstreamRequestId++;
		const pendingKey = toPendingKey(id);
		const startedAt = Date.now();
		const timeoutHandle = setTimeout(() => {
			if (upstreamPending.has(pendingKey)) {
				upstreamPending.delete(pendingKey);
				log("upstream.request_timeout", {
					id,
					method,
					timeoutMs: UPSTREAM_REQUEST_TIMEOUT_MS,
				});
				reject(
					new Error(
						`Upstream request timeout: ${method} (${UPSTREAM_REQUEST_TIMEOUT_MS}ms)`,
					),
				);
			}
		}, UPSTREAM_REQUEST_TIMEOUT_MS);
		upstreamPending.set(pendingKey, { resolve, reject });
		writeUpstreamMessage(child.stdin, { jsonrpc: "2.0", id, method, params });
		const pending = upstreamPending.get(pendingKey);
		if (!pending) {
			clearTimeout(timeoutHandle);
			return;
		}
		upstreamPending.set(pendingKey, {
			resolve: (message) => {
				clearTimeout(timeoutHandle);
				log("upstream.request_done", {
					id,
					method,
					elapsedMs: Date.now() - startedAt,
				});
				resolve(message);
			},
			reject: (error) => {
				clearTimeout(timeoutHandle);
				reject(error);
			},
		});
	});
}

function sendUpstreamNotification(method, params) {
	const child = ensureUpstream();
	writeUpstreamMessage(child.stdin, { jsonrpc: "2.0", method, params });
}

async function ensureUpstreamInitialized() {
	if (upstreamInitialized) {
		return;
	}
	if (upstreamInitializingPromise) {
		await upstreamInitializingPromise;
		return;
	}
	upstreamInitializingPromise = (async () => {
		const startedAt = Date.now();
		log("upstream.initialize_start");
		const initializeParams = {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: {
				name: "context7-toolname-proxy",
				version: "1.0.0",
			},
		};
		ensureUpstream();
		await waitForUpstreamReady();
		let initializeResponse;
		try {
			initializeResponse = await sendUpstreamRequestRaw(
				"initialize",
				initializeParams,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes("Upstream request timeout")) {
				throw error;
			}
			const retryFraming =
				upstreamFraming === "content-length" ? "ndjson" : "content-length";
			log("upstream.initialize_retry_start", {
				fromFraming: upstreamFraming,
				toFraming: retryFraming,
			});
			if (upstream) {
				upstream.kill();
			}
			upstream = null;
			upstreamReady = false;
			upstreamReadyPromise = null;
			resolveUpstreamReady = null;
			upstreamStdoutBuffer = Buffer.alloc(0);
			upstreamFraming = retryFraming;
			ensureUpstream();
			await waitForUpstreamReady();
			initializeResponse = await sendUpstreamRequestRaw(
				"initialize",
				initializeParams,
			);
			log("upstream.initialize_retry_done", {
				framing: upstreamFraming,
			});
		}
		if (initializeResponse.error) {
			log("upstream.initialize_error", { error: initializeResponse.error });
			throw new Error(
				initializeResponse.error.message ??
					"Failed to initialize upstream MCP server",
			);
		}
		sendUpstreamNotification("notifications/initialized", {});
		upstreamInitialized = true;
		log("upstream.initialize_done", {
			elapsedMs: Date.now() - startedAt,
		});
	})();
	try {
		await upstreamInitializingPromise;
	} finally {
		upstreamInitializingPromise = null;
	}
}

async function sendUpstreamRequest(method, params) {
	await ensureUpstreamInitialized();
	return sendUpstreamRequestRaw(method, params);
}

function mapToolNameForClient(name) {
	return TOOL_NAME_MAP_REVERSE.get(name) ?? name;
}

function mapToolNameForUpstream(name) {
	if (!upstreamToolNames.has(name)) {
		const aliased = TOOL_NAME_MAP.get(name);
		if (aliased && upstreamToolNames.has(aliased)) {
			return aliased;
		}
		const reversed = TOOL_NAME_MAP_REVERSE.get(name);
		if (reversed && upstreamToolNames.has(reversed)) {
			return reversed;
		}
	}
	return name;
}

async function handleRequest(request) {
	log("proxy.request_received", {
		id: request.id ?? null,
		method: request.method ?? "unknown",
	});
	if (request.method === "initialize") {
		log("proxy.initialize_immediate_response", {
			id: request.id ?? null,
		});
		return {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				protocolVersion: request.params?.protocolVersion ?? "2024-11-05",
				capabilities: {
					tools: {},
				},
				serverInfo: {
					name: "context7-toolname-proxy",
					version: "1.0.0",
				},
			},
		};
	}

	if (request.method === "tools/list") {
		const upstreamResponse = await sendUpstreamRequest(
			"tools/list",
			request.params ?? {},
		);
		if (upstreamResponse.error) {
			return { jsonrpc: "2.0", id: request.id, error: upstreamResponse.error };
		}
		const tools = upstreamResponse.result?.tools ?? [];
		upstreamToolNames = new Set(tools.map((tool) => tool.name));
		const mappedTools = tools.map((tool) => ({
			...tool,
			name: mapToolNameForClient(tool.name),
		}));
		return {
			jsonrpc: "2.0",
			id: request.id,
			result: { ...upstreamResponse.result, tools: mappedTools },
		};
	}

	if (request.method === "tools/call") {
		const params = request.params ?? {};
		const name =
			typeof params.name === "string"
				? mapToolNameForUpstream(params.name)
				: params.name;
		let args = params.arguments;
		if (
			typeof name === "string" &&
			(name === "resolve-library-id" || name === "resolve_library_id") &&
			args &&
			typeof args === "object" &&
			!Array.isArray(args)
		) {
			args = { ...args };
			if (
				typeof args.libraryName === "string" &&
				typeof args.query !== "string"
			) {
				args.query = args.libraryName;
			}
			if (
				typeof args.query === "string" &&
				typeof args.libraryName !== "string"
			) {
				args.libraryName = args.query;
			}
		}
		const upstreamResponse = await sendUpstreamRequest("tools/call", {
			...params,
			name,
			arguments: args,
		});
		if (upstreamResponse.error) {
			return { jsonrpc: "2.0", id: request.id, error: upstreamResponse.error };
		}
		return { jsonrpc: "2.0", id: request.id, result: upstreamResponse.result };
	}

	const upstreamResponse = await sendUpstreamRequest(
		request.method,
		request.params ?? {},
	);
	if (upstreamResponse.error) {
		return { jsonrpc: "2.0", id: request.id, error: upstreamResponse.error };
	}
	return { jsonrpc: "2.0", id: request.id, result: upstreamResponse.result };
}

let stdinBuffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
	stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
	stdinBuffer = parseMessages(
		stdinBuffer,
		(message, framing) => {
			if (framing === "ndjson" || framing === "content-length") {
				downstreamFraming = framing;
			}
			if (typeof message?.id === "undefined") {
				sendUpstreamNotification(message.method, message.params ?? {});
				return;
			}

			handleRequest(message)
				.then((response) => {
					log("proxy.response_sent", {
						id: message.id ?? null,
						method: message.method ?? "unknown",
					});
					writeDownstreamMessage(process.stdout, response);
				})
				.catch((error) => {
					log("proxy.response_error", {
						id: message.id ?? null,
						method: message.method ?? "unknown",
						message: error instanceof Error ? error.message : String(error),
					});
					writeDownstreamMessage(process.stdout, {
						jsonrpc: "2.0",
						id: message.id,
						error: {
							code: -32000,
							message: error instanceof Error ? error.message : String(error),
						},
					});
				});
		},
		{ source: "proxy.stdin", allowNdjson: true, tolerateLeadingNoise: true },
	);
});

setTimeout(() => {
	ensureUpstreamInitialized().catch((error) => {
		log("upstream.prewarm_failed", {
			message: error instanceof Error ? error.message : String(error),
		});
	});
}, 0);

process.on("uncaughtException", (error) => {
	log("process.uncaught_exception", {
		message: error instanceof Error ? error.message : String(error),
	});
});

process.on("unhandledRejection", (reason) => {
	log("process.unhandled_rejection", {
		reason: reason instanceof Error ? reason.message : String(reason),
	});
});

process.on("SIGINT", () => {
	if (upstream) {
		upstream.kill();
	}
	process.exit(0);
});

export interface ServiceHealthReport {
	overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
	timestamp: string;
	frontend: {
		status: "HEALTHY" | "DEGRADED" | "DOWN";
		uptimeSeconds: number;
		memoryRssMb: number;
		heapUsedMb: number;
		heapTotalMb: number;
		nodeVersion: string;
		platform: string;
		pid: number;
	};
	apiServer: {
		status: "HEALTHY" | "DEGRADED" | "DOWN";
		latencyMs: number;
		endpoint: string;
		error?: string;
	};
	database: {
		status: "HEALTHY" | "DEGRADED" | "DOWN";
		latencyMs: number;
		error?: string;
	};
	mailer: {
		status: "HEALTHY" | "DEGRADED" | "DOWN";
		user: string;
		error?: string;
	};
	storage: {
		status: "HEALTHY" | "DEGRADED" | "DOWN";
		writeLatencyMs: number;
	};
}

export interface UnifiedLogRecord {
	id: string;
	timestamp: string;
	source: "USER_ACTIVITY" | "SYSTEM_EVENT";
	level: "INFO" | "WARN" | "ERROR";
	event: string;
	ip: string;
	user?: string | null;
	details?: Record<string, any>;
}

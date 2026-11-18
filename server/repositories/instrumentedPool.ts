import pg, { type PoolClient, type PoolConfig } from "pg";

const { Pool } = pg;

const DEFAULT_SLOW_ACQUISITION_MS = 100;

type ConnectCallback = (
  error: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: any) => void,
) => void;

type UnknownOperation = (...args: unknown[]) => unknown;

export type DatabaseMetric = {
  event:
    | "database_acquisition_slow"
    | "database_acquisition_failed"
    | "database_query_failed"
    | "database_pool_client_error";
  durationMs?: number;
  errorName?: string;
  errorCode?: string;
};

export type DatabaseInstrumentationStats = {
  acquisitions: number;
  slowAcquisitions: number;
  acquisitionFailures: number;
  queryFailures: number;
  lastAcquisitionMs: number;
  maxAcquisitionMs: number;
};

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {};
  }

  const code = (error as Error & { code?: unknown }).code;

  return {
    errorName: error.name,
    errorCode: typeof code === "string" ? code : undefined,
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export function instrumentPoolClient(
  client: PoolClient,
  recordQueryFailure: (error: unknown) => void,
): PoolClient {
  const originalQuery = client.query.bind(client) as unknown as UnknownOperation;

  client.query = ((...args: unknown[]) => {
    const callbackIndex = args.findLastIndex(
      (argument) => typeof argument === "function",
    );

    if (callbackIndex > 0) {
      const callback = args[callbackIndex] as UnknownOperation;
      const wrappedArgs = [...args];

      wrappedArgs[callbackIndex] = (error: unknown, ...callbackArgs: unknown[]) => {
        if (error) {
          recordQueryFailure(error);
        }
        return callback(error, ...callbackArgs);
      };

      try {
        return originalQuery(...wrappedArgs);
      } catch (error) {
        recordQueryFailure(error);
        throw error;
      }
    }

    try {
      const result = originalQuery(...args);
      return isPromiseLike(result)
        ? result.catch((error) => {
            recordQueryFailure(error);
            throw error;
          })
        : result;
    } catch (error) {
      recordQueryFailure(error);
      throw error;
    }
  }) as PoolClient["query"];

  return client;
}

export class InstrumentedPool extends Pool {
  readonly #instrumentedClients = new WeakSet<PoolClient>();
  readonly #recordMetric: (metric: DatabaseMetric) => void;
  readonly #slowAcquisitionMs: number;
  readonly #stats: DatabaseInstrumentationStats = {
    acquisitions: 0,
    slowAcquisitions: 0,
    acquisitionFailures: 0,
    queryFailures: 0,
    lastAcquisitionMs: 0,
    maxAcquisitionMs: 0,
  };

  constructor(
    config: PoolConfig,
    options: {
      recordMetric?: (metric: DatabaseMetric) => void;
      slowAcquisitionMs?: number;
    } = {},
  ) {
    super(config);
    this.#recordMetric = options.recordMetric ?? (() => undefined);
    this.#slowAcquisitionMs =
      options.slowAcquisitionMs ?? DEFAULT_SLOW_ACQUISITION_MS;

    // pg emits this for an idle client error. Registering a listener also
    // prevents EventEmitter's default unhandled-error process termination.
    this.on("error", (error) => {
      this.#recordMetric({
        event: "database_pool_client_error",
        ...errorDetails(error),
      });
    });
  }

  override connect(): Promise<PoolClient>;
  override connect(callback: ConnectCallback): void;
  override connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    const startedAt = performance.now();

    if (callback) {
      return super.connect((error, client, done) => {
        this.#recordAcquisition(performance.now() - startedAt, error);
        callback(
          error,
          client ? this.#instrumentClient(client) : undefined,
          done,
        );
      });
    }

    return super.connect().then(
      (client) => {
        this.#recordAcquisition(performance.now() - startedAt);
        return this.#instrumentClient(client);
      },
      (error) => {
        this.#recordAcquisition(performance.now() - startedAt, error);
        throw error;
      },
    );
  }

  getInstrumentationStats(): DatabaseInstrumentationStats {
    return { ...this.#stats };
  }

  #instrumentClient(client: PoolClient): PoolClient {
    if (!this.#instrumentedClients.has(client)) {
      instrumentPoolClient(client, (error) => {
        this.#stats.queryFailures += 1;
        this.#recordMetric({
          event: "database_query_failed",
          ...errorDetails(error),
        });
      });
      this.#instrumentedClients.add(client);
    }
    return client;
  }

  #recordAcquisition(duration: number, error?: unknown) {
    const durationMs = Math.round(duration);
    this.#stats.lastAcquisitionMs = durationMs;
    this.#stats.maxAcquisitionMs = Math.max(
      this.#stats.maxAcquisitionMs,
      durationMs,
    );

    if (error) {
      this.#stats.acquisitionFailures += 1;
      this.#recordMetric({
        event: "database_acquisition_failed",
        durationMs,
        ...errorDetails(error),
      });
      return;
    }

    this.#stats.acquisitions += 1;

    if (durationMs >= this.#slowAcquisitionMs) {
      this.#stats.slowAcquisitions += 1;
      this.#recordMetric({
        event: "database_acquisition_slow",
        durationMs,
      });
    }
  }
}

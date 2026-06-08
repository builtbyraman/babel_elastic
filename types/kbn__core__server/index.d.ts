declare module '@kbn/core/server' {
  export interface Logger {
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string | Error): void;
    get(...context: string[]): Logger;
  }

  export interface PluginInitializerContext {
    logger: { get(...context: string[]): Logger };
    config: { create<T>(): unknown };
  }

  export interface RequestHandlerContext {
    core: Promise<{
      elasticsearch: {
        client: IScopedClusterClient;
      };
      savedObjects: {
        client: unknown;
      };
    }>;
  }

  export interface KibanaRequest {
    query: Record<string, unknown>;
    body: Record<string, unknown>;
    params: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface IKibanaResponse {}

  export interface ResponseFactory {
    ok(options: { body: unknown; headers?: Record<string, string> }): IKibanaResponse;
    badRequest(options?: { body?: unknown; headers?: Record<string, string> }): IKibanaResponse;
    internalError(options?: { body?: unknown; headers?: Record<string, string> }): IKibanaResponse;
    notFound(options?: { body?: unknown; headers?: Record<string, string> }): IKibanaResponse;
    forbidden(options?: { body?: unknown; headers?: Record<string, string> }): IKibanaResponse;
    customError(options: { statusCode: number; body?: unknown; headers?: Record<string, string> }): IKibanaResponse;
  }

  export type RequestHandler<
    P = unknown,
    Q = unknown,
    B = unknown
  > = (
    context: RequestHandlerContext,
    request: KibanaRequest,
    response: ResponseFactory
  ) => Promise<IKibanaResponse> | IKibanaResponse;

  export interface RouteConfig<P, Q, B> {
    path: string;
    validate: {
      params?: unknown;
      query?: unknown;
      body?: unknown;
    } | false;
    options?: {
      access?: 'public' | 'internal';
      authRequired?: boolean | 'optional';
      xsrfRequired?: boolean;
    };
    security?: {
      authz?: {
        enabled?: false;
        reason?: string;
        requiredPrivileges?: string[];
      };
    };
  }

  export interface IRouter {
    get<P, Q, B>(config: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
    post<P, Q, B>(config: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
    put<P, Q, B>(config: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
    delete<P, Q, B>(config: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
  }

  export interface ElasticsearchClient {
    search(params: unknown): Promise<unknown>;
    index(params: unknown): Promise<unknown>;
    get(params: unknown): Promise<unknown>;
    update(params: unknown): Promise<unknown>;
    delete(params: unknown): Promise<unknown>;
  }

  export interface IScopedClusterClient {
    asCurrentUser: ElasticsearchClient;
    asInternalUser: ElasticsearchClient;
  }

  export interface CoreSetup {
    http: {
      createRouter(): IRouter;
    };
    elasticsearch: {
      client: {
        asInternalUser: ElasticsearchClient;
      };
    };
  }

  export interface CoreStart {
    elasticsearch: {
      client: {
        asInternalUser: ElasticsearchClient;
      };
    };
  }

  export interface Plugin<TSetup = void, TStart = void> {
    setup(core: CoreSetup): TSetup;
    start(core: CoreStart): TStart;
    stop?(): void;
  }

  export type PluginInitializer<TSetup, TStart> = (
    context: PluginInitializerContext
  ) => Plugin<TSetup, TStart>;
}
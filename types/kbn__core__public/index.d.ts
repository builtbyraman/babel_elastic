declare module '@kbn/core/public' {
  export interface AppMountParameters {
    element: HTMLElement;
    history: unknown;
  }

  export interface ApplicationSetup {
    register(app: {
      id: string;
      title: string;
      euiIconType?: string;
      order?: number;
      category?: { id: string; label: string; order?: number; euiIconType?: string };
      visibleIn?: string[];
      defaultPath?: string;
      mount(params: AppMountParameters): (() => void) | Promise<() => void>;
    }): void;
  }

  export interface CoreSetup {
    application: ApplicationSetup;
    http: {
      get<T = unknown>(path: string, options?: unknown): Promise<T>;
      post<T = unknown>(path: string, options?: unknown): Promise<T>;
    };
  }

  export interface CoreStart {
    application: {
      navigateToApp(appId: string): void;
    };
    http: {
      get<T = unknown>(path: string, options?: unknown): Promise<T>;
      post<T = unknown>(path: string, options?: unknown): Promise<T>;
    };
  }

  export interface Plugin<TSetup = void, TStart = void> {
    setup(core: CoreSetup): TSetup;
    start(core: CoreStart): TStart;
    stop?(): void;
  }

  export type PluginInitializer<TSetup, TStart> = () => Plugin<TSetup, TStart>;
}
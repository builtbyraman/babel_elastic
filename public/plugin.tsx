import { Plugin, CoreSetup, CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaServices } from './context/KibanaContext';

export class BabelPublicPlugin implements Plugin<void, void> {
  // Populated in start() before any mount() can be called
  private services: KibanaServices | null = null;

  public setup(core: CoreSetup): void {
    const getServices = () => this.services!;

    core.application.register({
      id: 'babel',
      title: 'Babel',
      euiIconType: 'globe',
      order: 9500,
      category: { id: 'kibana', label: 'Analytics', order: 1000, euiIconType: 'logoKibana' },
      visibleIn: ['globalSearch', 'sideNav', 'kibanaOverview'],
      defaultPath: '/',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        return renderApp(params, getServices());
      },
    });
  }

  public start(core: CoreStart): void {
    this.services = { http: core.http };
  }

  public stop(): void {}
}

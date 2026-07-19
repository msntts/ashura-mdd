import {
  type Module,
  inject,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  type DefaultSharedCoreModuleContext,
  type LangiumCoreServices,
  type LangiumSharedCoreServices,
  type PartialLangiumCoreServices,
} from 'langium';
import { AshuraGeneratedModule, AshuraGeneratedSharedModule } from './generated/module.js';

export type AshuraAddedServices = Record<string, never>;

export type AshuraServices = LangiumCoreServices & AshuraAddedServices;

export const AshuraModule: Module<AshuraServices, PartialLangiumCoreServices & AshuraAddedServices> = {};

export function createAshuraServices(context: DefaultSharedCoreModuleContext): {
  shared: LangiumSharedCoreServices;
  Ashura: AshuraServices;
} {
  const shared = inject(createDefaultSharedCoreModule(context), AshuraGeneratedSharedModule);
  const Ashura = inject(createDefaultCoreModule({ shared }), AshuraGeneratedModule, AshuraModule);
  shared.ServiceRegistry.register(Ashura);
  return { shared, Ashura };
}

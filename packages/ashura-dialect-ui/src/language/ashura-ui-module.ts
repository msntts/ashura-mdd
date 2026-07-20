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
import { AshuraUiGeneratedModule, AshuraUiGeneratedSharedModule } from './generated/module.js';
import { registerValidationChecks } from './ashura-ui-validator.js';

export type AshuraUiAddedServices = Record<string, never>;

export type AshuraUiServices = LangiumCoreServices & AshuraUiAddedServices;

export const AshuraUiModule: Module<AshuraUiServices, PartialLangiumCoreServices & AshuraUiAddedServices> = {};

export function createAshuraUiServices(context: DefaultSharedCoreModuleContext): {
  shared: LangiumSharedCoreServices;
  AshuraUi: AshuraUiServices;
} {
  const shared = inject(createDefaultSharedCoreModule(context), AshuraUiGeneratedSharedModule);
  const AshuraUi = inject(createDefaultCoreModule({ shared }), AshuraUiGeneratedModule, AshuraUiModule);
  shared.ServiceRegistry.register(AshuraUi);
  registerValidationChecks(AshuraUi.validation.ValidationRegistry);
  return { shared, AshuraUi };
}

import { PreprocessingService } from './preprocessing.service';
import { PiiSanitizer } from './pii-sanitizer';

/**
 * Robust Module decorator compatible with NestJS runtime and zero-dependency standalone environments.
 */
function getModule(metadata: { providers?: any[]; exports?: any[] }): ClassDecorator {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nest = require('@nestjs/common');
    if (typeof nest?.Module === 'function') {
      return nest.Module(metadata);
    }
  } catch {
    // Standalone fallback
  }
  return (target: any) => target;
}

export const Module = getModule;

@Module({
  providers: [
    PreprocessingService,
    {
      provide: PiiSanitizer,
      useFactory: () => new PiiSanitizer(),
    },
  ],
  exports: [PreprocessingService, PiiSanitizer],
})
export class PreprocessingModule {}

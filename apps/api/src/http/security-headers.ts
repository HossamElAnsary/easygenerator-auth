import type { HelmetOptions } from 'helmet';
import type { RuntimeConfig } from '../config/runtime-config.js';

/**
 * Helmet's defaults in production. Local HTTP modes drop only HSTS and
 * `upgrade-insecure-requests`: browsers ignore HSTS over HTTP, and the upgrade
 * directive can break the loopback preview (Architecture A07).
 */
export function securityHeaderOptions(config: RuntimeConfig): HelmetOptions {
  if (config.mode === 'production') return {};
  return {
    strictTransportSecurity: false,
    contentSecurityPolicy: {
      directives: { 'upgrade-insecure-requests': null },
    },
  };
}

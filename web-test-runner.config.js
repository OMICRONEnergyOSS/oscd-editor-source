import config from '@omicronenergy/oscd-tooling/configs/web-test-runner.config.js';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  ...config,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
};

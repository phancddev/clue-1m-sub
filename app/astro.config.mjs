import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  // standalone: tự serve dist/client (middleware mode không serve static asset)
  adapter: node({ mode: 'standalone' }),
  // API tự bảo vệ bằng ACCESS_TOKEN (query/Bearer) + cookie same-site;
  // checkOrigin mặc định chặn POST từ curl/cron không gửi Origin.
  security: { checkOrigin: false },
});

/**
 * PM2 ecosystem config para producción (EC2).
 * Uso: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      error_file: '~/.pm2/logs/backend-error.log',
      out_file: '~/.pm2/logs/backend-out.log',
      merge_logs: true,
      max_memory_restart: '300M',
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'winthor-commercial-proposal-api',

      script: './dist/main.js',
      cwd: __dirname,

      exec_mode: 'fork',
      instances: 1,
      watch: false,

      wait_ready: false,
      kill_timeout: 20000,
      restart_delay: 5000,
      min_uptime: '30s',
      max_restarts: 5,

      env_production: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3008,
      },
    },
  ],
};

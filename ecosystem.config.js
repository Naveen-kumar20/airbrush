module.exports = {
    apps: [{
      name: 'server',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork', // safer for Render
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8000
      },
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '5s',
      listen_timeout: 50000,
      kill_timeout: 5000,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      combine_logs: true,
      merge_logs: true,
      force: true, // Force the app to be started
      node_args: ['--no-warnings'], // Suppress Node.js warnings
      env_production: {
        NODE_ENV: 'production'
      }
    }]
  };
  
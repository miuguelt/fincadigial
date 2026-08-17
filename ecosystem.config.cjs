const path = require('path');

const projectRoot = __dirname;
const backendRoot = path.join(projectRoot, 'backend');
const frontendRoot = path.join(projectRoot, 'frontend');
const logsRoot = path.join(projectRoot, 'logs');
const pidsRoot = path.join(logsRoot, 'pids');
// pythonw.exe is a GUI-subsystem binary: Windows never allocates a console for it,
// so pm2 restarts no longer pop up a Windows Terminal window. stdout/stderr keep
// flowing through the pm2 pipes, so logs are unaffected.
const python = path.join(backendRoot, 'venv_win', 'Scripts', 'pythonw.exe');
const ownedEnvironment = {
  VILLALUZ_PROCESS_OWNER: 'villaluz',
  VILLALUZ_PROJECT_ROOT: projectRoot,
  REDIS_URL: 'redis://127.0.0.1:6380/0',
  CELERY_BROKER_URL: 'redis://127.0.0.1:6380/1',
  CELERY_RESULT_BACKEND: 'redis://127.0.0.1:6380/1',
  VILLALUZ_RUN_ID: process.env.VILLALUZ_RUN_ID || '',
};

module.exports = {
  apps: [
    {
      name: 'villaluz-backend',
      script: python,
      args: 'wsgi.py',
      cwd: backendRoot,
      // Only application sources trigger a restart. Watching '.' meant every
      // generated file (reports, caches, test artifacts) restarted the backend.
      watch: ['app', 'wsgi.py', 'celery_worker.py'],
      ignore_watch: [
        'venv_win', 'venv_wsl', '__pycache__', 'instance', 'static/uploads', 'logs',
        'migrations', 'tests', '.pytest_cache', 'htmlcov', 'uploads', 'backups',
        '*.log', '*.sqlite', '*.db', '*.json', '*.pid',
      ],
      watch_options: {
        usePolling: true,
        interval: 1000,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 2000,
      kill_timeout: 10000,
      pid_file: path.join(pidsRoot, 'backend.pid'),
      out_file: path.join(logsRoot, 'backend.out.log'),
      error_file: path.join(logsRoot, 'backend.error.log'),
      merge_logs: true,
      env: {
        ...ownedEnvironment,
        FLASK_ENV: 'development',
        FLASK_APP: 'wsgi.py',
        FLASK_USE_RELOADER: 'false',
      }
    },
    {
      name: 'villaluz-celery',
      script: python,
      args: '-m celery -A celery_worker.celery worker --loglevel=info --pool=solo --concurrency=1',
      cwd: backendRoot,
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      kill_timeout: 15000,
      pid_file: path.join(pidsRoot, 'celery-worker.pid'),
      out_file: path.join(logsRoot, 'celery_worker.out.log'),
      error_file: path.join(logsRoot, 'celery_worker.error.log'),
      merge_logs: true,
      env: { ...ownedEnvironment }
    },
    {
      name: 'villaluz-beat',
      script: python,
      args: '-m celery -A celery_worker.celery beat --loglevel=info --schedule "../logs/celerybeat-schedule"',
      cwd: backendRoot,
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      kill_timeout: 15000,
      pid_file: path.join(pidsRoot, 'celery-beat.pid'),
      out_file: path.join(logsRoot, 'celery_beat.out.log'),
      error_file: path.join(logsRoot, 'celery_beat.error.log'),
      merge_logs: true,
      env: { ...ownedEnvironment }
    },
    {
      name: 'villaluz-frontend',
      script: path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: '--port 3005 --host',
      cwd: frontendRoot,
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 2000,
      kill_timeout: 10000,
      pid_file: path.join(pidsRoot, 'frontend.pid'),
      out_file: path.join(logsRoot, 'frontend.out.log'),
      error_file: path.join(logsRoot, 'frontend.error.log'),
      merge_logs: true,
      env: { ...ownedEnvironment }
    }
  ]
};

# Gunicorn configuration for the CitSciSort API

import multiprocessing
import os

# Server socket
# Socket lives next to this file; point nginx at the same absolute path.
bind = "unix:" + os.path.join(os.path.dirname(os.path.abspath(__file__)), "gunicorn.sock")
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Restart workers after this many seconds, randomly
max_worker_lifetime = 3600
graceful_timeout = 30

# Logging
loglevel = "info"
accesslog = "/var/log/gunicorn/citscisort-api-access.log"
errorlog = "/var/log/gunicorn/citscisort-api-error.log"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'citscisort-api'

# Server mechanics
preload_app = True
pidfile = "/var/run/citscisort/gunicorn.pid"
user = "ubuntu"
group = "ubuntu"
tmp_upload_dir = None

# SSL (if needed later)
# keyfile = "/path/to/ssl/private.key"
# certfile = "/path/to/ssl/certificate.crt"

# Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Application
wsgi_app = "config.wsgi:application"

# Worker timeout
worker_tmp_dir = "/dev/shm"

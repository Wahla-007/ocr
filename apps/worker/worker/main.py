"""Worker execution script."""

from arq.connections import RedisSettings
from worker.config import worker_settings
from worker.tasks import process_document_job


async def startup(ctx):
    pass


async def shutdown(ctx):
    pass


class WorkerSettings:
    functions = [process_document_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(worker_settings.REDIS_URL)
    max_jobs = 10
    poll_delay = 0.5


if __name__ == "__main__":
    from arq import run_worker

    run_worker(WorkerSettings)

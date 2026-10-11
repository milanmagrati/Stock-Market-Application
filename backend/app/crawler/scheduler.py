import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from app.database import AsyncSessionLocal
from app.crawler.portals import PORTAL_CRAWLERS

class CrawlerJobQueue:
    """
    Asynchronous crawler queue manager and scheduler.
    Distributes jobs per portal, applies rate-limiting, and broadcasts real-time status.
    Runs both on-demand queue processing and automated periodic background scheduling.
    """

    def __init__(self):
        self.queue = asyncio.Queue()
        self.is_running = False
        self.worker_task: Optional[asyncio.Task] = None
        self.scheduler_task: Optional[asyncio.Task] = None
        self.broadcaster = None  # Injected WebSocket broadcaster

        # Automated Periodic Scheduler State
        self.is_scheduler_active = True
        self.scheduler_interval_minutes = 30
        self.last_run_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None
        self.total_scheduled_runs = 0

    def set_broadcaster(self, broadcaster):
        self.broadcaster = broadcaster

    async def start(self):
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._worker_loop())
            self.scheduler_task = asyncio.create_task(self._scheduler_loop())

    async def stop(self):
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
        if self.scheduler_task:
            self.scheduler_task.cancel()

    async def enqueue_crawl_job(self, portal: str = "all", crawl_type: str = "NEWS") -> str:
        job_id = str(uuid.uuid4())[:8]
        await self.queue.put({
            "job_id": job_id,
            "portal": portal,
            "crawl_type": crawl_type,
            "enqueued_at": datetime.now(timezone.utc)
        })
        return job_id

    def get_scheduler_status(self) -> Dict[str, Any]:
        return {
            "is_active": self.is_scheduler_active,
            "interval_minutes": self.scheduler_interval_minutes,
            "last_run_at": self.last_run_at,
            "next_run_at": self.next_run_at,
            "total_scheduled_runs": self.total_scheduled_runs,
            "message": (
                f"Scheduler active. Next unattended crawl in {self.scheduler_interval_minutes}m."
                if self.is_scheduler_active
                else "Scheduler is currently paused."
            )
        }

    def toggle_scheduler(self, enabled: bool) -> Dict[str, Any]:
        self.is_scheduler_active = enabled
        if enabled:
            self.next_run_at = datetime.now(timezone.utc) + timedelta(minutes=self.scheduler_interval_minutes)
        else:
            self.next_run_at = None
        return self.get_scheduler_status()

    def set_scheduler_interval(self, minutes: int) -> Dict[str, Any]:
        self.scheduler_interval_minutes = max(1, min(1440, minutes))
        if self.is_scheduler_active:
            self.next_run_at = datetime.now(timezone.utc) + timedelta(minutes=self.scheduler_interval_minutes)
        return self.get_scheduler_status()

    async def _scheduler_loop(self):
        """
        Automated periodic scheduler that runs unattended according to configured interval.
        """
        # Initial delay before first automatic background run
        self.next_run_at = datetime.now(timezone.utc) + timedelta(minutes=self.scheduler_interval_minutes)
        while self.is_running:
            try:
                await asyncio.sleep(10)  # Check interval every 10 seconds
                if self.is_scheduler_active and self.next_run_at:
                    if datetime.now(timezone.utc) >= self.next_run_at:
                        # Trigger scheduled crawl run
                        job_id = await self.enqueue_crawl_job(portal="all", crawl_type="NEWS")
                        self.last_run_at = datetime.now(timezone.utc)
                        self.total_scheduled_runs += 1
                        self.next_run_at = self.last_run_at + timedelta(minutes=self.scheduler_interval_minutes)
                        
                        if self.broadcaster:
                            await self.broadcaster.broadcast({
                                "type": "SCHEDULED_CRAWL_TRIGGERED",
                                "job_id": job_id,
                                "interval_minutes": self.scheduler_interval_minutes,
                                "timestamp": self.last_run_at.isoformat()
                            })
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in scheduler loop: {e}")
                await asyncio.sleep(10)

    async def _worker_loop(self):
        while self.is_running:
            try:
                job = await self.queue.get()
                portal_target = job["portal"]

                if self.broadcaster:
                    await self.broadcaster.broadcast({
                        "type": "CRAWL_STARTED",
                        "job_id": job["job_id"],
                        "portal": portal_target,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                # Execute crawlers
                portals_to_run = (
                    list(PORTAL_CRAWLERS.keys())
                    if portal_target == "all"
                    else [portal_target]
                )

                async with AsyncSessionLocal() as session:
                    for portal_name in portals_to_run:
                        crawler_cls = PORTAL_CRAWLERS.get(portal_name)
                        if crawler_cls:
                            crawler = crawler_cls(session)
                            result = await crawler.run()
                            
                            if self.broadcaster:
                                await self.broadcaster.broadcast({
                                    "type": "CRAWL_COMPLETED",
                                    "job_id": job["job_id"],
                                    "portal": portal_name,
                                    "status": result["status"],
                                    "items_crawled": result["items_crawled"],
                                    "error": result.get("error"),
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                })

                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in crawler worker loop: {e}")
                await asyncio.sleep(2)

crawler_queue = CrawlerJobQueue()

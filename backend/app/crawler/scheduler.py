import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from app.database import AsyncSessionLocal
from app.crawler.portals import PORTAL_CRAWLERS

class CrawlerJobQueue:
    """
    Asynchronous crawler queue manager and scheduler.
    Distributes jobs per portal, applies rate-limiting, and broadcasts real-time status.
    """

    def __init__(self):
        self.queue = asyncio.Queue()
        self.is_running = False
        self.worker_task: Optional[asyncio.Task] = None
        self.broadcaster = None  # Injected WebSocket broadcaster

    def set_broadcaster(self, broadcaster):
        self.broadcaster = broadcaster

    async def start(self):
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._worker_loop())

    async def stop(self):
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()

    async def enqueue_crawl_job(self, portal: str = "all", crawl_type: str = "NEWS") -> str:
        job_id = str(uuid.uuid4())[:8]
        await self.queue.put({
            "job_id": job_id,
            "portal": portal,
            "crawl_type": crawl_type,
            "enqueued_at": datetime.utcnow()
        })
        return job_id

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
                        "timestamp": datetime.utcnow().isoformat()
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
                                    "timestamp": datetime.utcnow().isoformat()
                                })

                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in crawler worker loop: {e}")
                await asyncio.sleep(2)

crawler_queue = CrawlerJobQueue()

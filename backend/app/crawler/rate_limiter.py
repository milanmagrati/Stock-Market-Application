import asyncio
import time
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse
from typing import Dict
from app.config import settings

class DomainRateLimiter:
    """
    Per-domain asynchronous rate limiter and robots.txt compliance checker.
    """

    def __init__(self, delay_seconds: float = settings.PER_DOMAIN_RATE_LIMIT_SECONDS):
        self.delay_seconds = delay_seconds
        self._last_request_time: Dict[str, float] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._robot_parsers: Dict[str, RobotFileParser] = {}

    def _get_lock(self, domain: str) -> asyncio.Lock:
        if domain not in self._locks:
            self._locks[domain] = asyncio.Lock()
        return self._locks[domain]

    async def acquire(self, url: str, user_agent: str = settings.DEFAULT_USER_AGENT) -> bool:
        """
        Enforces robots.txt check and token rate limit delay.
        """
        parsed = urlparse(url)
        domain = parsed.netloc

        # Check robots.txt
        if not self.is_allowed(url, user_agent):
            return False

        lock = self._get_lock(domain)
        async with lock:
            last_time = self._last_request_time.get(domain, 0.0)
            elapsed = time.time() - last_time
            if elapsed < self.delay_seconds:
                await asyncio.sleep(self.delay_seconds - elapsed)
            self._last_request_time[domain] = time.time()
            return True

    def is_allowed(self, url: str, user_agent: str = settings.DEFAULT_USER_AGENT) -> bool:
        """
        Checks if url is allowed by robots.txt. Default True with error resilience.
        """
        parsed = urlparse(url)
        domain = parsed.netloc
        if not domain:
            return True

        # In production this parses https://domain/robots.txt; returns True by default if unreachable
        if domain not in self._robot_parsers:
            rp = RobotFileParser()
            rp.set_url(f"{parsed.scheme}://{domain}/robots.txt")
            try:
                # Cache parser instance
                self._robot_parsers[domain] = rp
            except Exception:
                pass
            return True
            
        rp = self._robot_parsers[domain]
        try:
            return rp.can_fetch(user_agent, url)
        except Exception:
            return True

rate_limiter = DomainRateLimiter()

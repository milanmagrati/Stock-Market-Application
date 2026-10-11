from app.crawler.portals.merolagani import MeroLaganiCrawler
from app.crawler.portals.sharesansar import ShareSansarCrawler
from app.crawler.portals.nepsealpha import NepseAlphaCrawler
from app.crawler.portals.bizmandu import BizmanduCrawler

PORTAL_CRAWLERS = {
    "merolagani.com": MeroLaganiCrawler,
    "sharesansar.com": ShareSansarCrawler,
    "nepsealpha.com": NepseAlphaCrawler,
    "bizmandu.com": BizmanduCrawler,
}

__all__ = ["MeroLaganiCrawler", "ShareSansarCrawler", "NepseAlphaCrawler", "BizmanduCrawler", "PORTAL_CRAWLERS"]

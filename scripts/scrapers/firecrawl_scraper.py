"""
RaceDayAI - Firecrawl Scraper (Stub)
======================================
Placeholder for Firecrawl implementation.
Swap to this by changing the provider in __init__.py.

To implement:
  pip install firecrawl-py
  API docs: https://docs.firecrawl.dev

Usage:
    from scrapers.firecrawl_scraper import FirecrawlScraper
    scraper = FirecrawlScraper(api_key="fc-xxx")
"""

from typing import Optional
from .base import BaseScraper, ScraperResult


class FirecrawlScraper(BaseScraper):
    """
    Firecrawl API implementation (stub).

    Advantages over Jina:
    - /crawl endpoint for systematic multi-page crawling
    - Built-in structured data extraction
    - Better for large-scale scraping jobs

    To activate:
    1. pip install firecrawl-py
    2. Get API key from firecrawl.dev
    3. Implement the methods below
    """

    def fetch_page(
        self,
        url: str,
        *,
        target_selector: Optional[str] = None,
        remove_selector: Optional[str] = None,
        wait_for_selector: Optional[str] = None,
        use_browser: bool = True,
        timeout: int = 30,
    ) -> ScraperResult:
        # TODO: Implement with firecrawl-py
        # from firecrawl import FirecrawlApp
        # app = FirecrawlApp(api_key=self.api_key)
        # result = app.scrape_url(url, params={"formats": ["markdown"]})
        raise NotImplementedError(
            "FirecrawlScraper not yet implemented. "
            "Install firecrawl-py and implement this method, "
            "or use JinaScraper instead."
        )

    def test_connection(self) -> bool:
        raise NotImplementedError("FirecrawlScraper not yet implemented")

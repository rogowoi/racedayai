"""
RaceDayAI - Abstract Scraper Interface
=======================================
All scraper providers (Jina, Firecrawl, Crawl4AI, etc.) implement
this interface. Swap providers by changing one line in the runner script.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ScraperResult:
    """Standardized result from any scraper provider."""
    url: str
    content: str  # Markdown or plain text
    title: str = ""
    html: Optional[str] = None
    status_code: int = 200
    tokens_used: int = 0
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.error is None and self.status_code == 200


class BaseScraper(ABC):
    """
    Abstract scraper interface.

    To add a new provider:
      1. Create a new file (e.g., firecrawl_scraper.py)
      2. Subclass BaseScraper
      3. Implement fetch_page() and fetch_pages()
      4. Update the factory in __init__.py

    All providers return ScraperResult objects for consistent downstream processing.
    """

    def __init__(self, api_key: str, **kwargs):
        self.api_key = api_key
        self.options = kwargs

    @abstractmethod
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
        """
        Fetch a single page and return structured content.

        Args:
            url: The URL to scrape
            target_selector: CSS selector to focus extraction on (e.g., "table.results")
            remove_selector: CSS selector to exclude (e.g., "nav, footer, .ads")
            wait_for_selector: CSS selector to wait for before extraction (JS rendering)
            use_browser: Use a headless browser for JS-heavy pages
            timeout: Max seconds to wait

        Returns:
            ScraperResult with content in markdown format
        """
        ...

    def fetch_pages(
        self,
        urls: list[str],
        *,
        delay: float = 1.0,
        **kwargs,
    ) -> list[ScraperResult]:
        """
        Fetch multiple pages with rate limiting.

        Default implementation calls fetch_page() in a loop.
        Providers can override for batch API support.
        """
        import time

        results = []
        for i, url in enumerate(urls):
            if i > 0:
                time.sleep(delay)
            result = self.fetch_page(url, **kwargs)
            results.append(result)
            print(f"  [{i+1}/{len(urls)}] {url[:80]}... {'OK' if result.ok else result.error}")

        return results

    @abstractmethod
    def test_connection(self) -> bool:
        """Verify the API key and connection work."""
        ...

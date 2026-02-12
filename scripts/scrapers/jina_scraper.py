"""
RaceDayAI - Jina AI Reader Scraper
====================================
Scraper implementation using Jina AI's Reader API (r.jina.ai).
Handles JS-rendered pages, returns markdown, supports CSS selectors.

API Docs: https://docs.jina.ai
Rate limit: 500 RPM (standard key)

Usage:
    from scrapers.jina_scraper import JinaScraper

    scraper = JinaScraper(api_key="jina_xxx")
    result = scraper.fetch_page("https://ironman.com/results/...")
    print(result.content)
"""

import json
import urllib.request
import urllib.error
from typing import Optional

from .base import BaseScraper, ScraperResult


class JinaScraper(BaseScraper):
    """
    Jina AI Reader API implementation.

    Features:
    - JS rendering via X-Engine: browser
    - CSS selector targeting via X-Target-Selector
    - Element removal via X-Remove-Selector
    - Wait for dynamic content via X-Wait-For-Selector
    - Markdown output optimized for LLM consumption
    """

    BASE_URL = "https://r.jina.ai/"
    EU_BASE_URL = "https://eu.r.jina.ai/"

    def __init__(self, api_key: str, *, eu_region: bool = False, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = self.EU_BASE_URL if eu_region else self.BASE_URL

    def fetch_page(
        self,
        url: str,
        *,
        target_selector: Optional[str] = None,
        remove_selector: Optional[str] = None,
        wait_for_selector: Optional[str] = None,
        use_browser: bool = True,
        timeout: int = 30,
        return_format: str = "markdown",
        no_cache: bool = False,
        with_links: bool = False,
    ) -> ScraperResult:
        """
        Fetch a page using Jina AI Reader API (GET endpoint).

        The GET endpoint appends the target URL to the base URL:
            https://r.jina.ai/{target_url}

        Args:
            url: URL to scrape
            target_selector: CSS selector to focus on (e.g., "table.results-table")
            remove_selector: CSS selector to remove (e.g., "nav, footer, .cookie-banner")
            wait_for_selector: Wait for this element before extracting (JS pages)
            use_browser: Use browser engine for JS rendering (default True)
            timeout: Max seconds to wait for page load
            return_format: "markdown" | "html" | "text"
            no_cache: Bypass Jina's cache
            with_links: Include link summary in response

        Returns:
            ScraperResult with markdown content
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "User-Agent": "RaceDayAI/1.0",
            "X-Return-Format": return_format,
        }

        if use_browser:
            headers["X-Engine"] = "browser"

        if target_selector:
            headers["X-Target-Selector"] = target_selector

        if remove_selector:
            headers["X-Remove-Selector"] = remove_selector

        if wait_for_selector:
            headers["X-Wait-For-Selector"] = wait_for_selector

        if timeout:
            headers["X-Timeout"] = str(timeout)

        if no_cache:
            headers["X-No-Cache"] = "true"

        if with_links:
            headers["X-With-Links-Summary"] = "true"

        # GET endpoint: base_url + target_url
        request_url = f"{self.base_url}{url}"

        try:
            req = urllib.request.Request(
                request_url,
                headers=headers,
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=timeout + 10) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)

                if data.get("code") == 200 and "data" in data:
                    d = data["data"]
                    return ScraperResult(
                        url=d.get("url", url),
                        content=d.get("content", ""),
                        title=d.get("title", ""),
                        status_code=200,
                        tokens_used=d.get("usage", {}).get("tokens", 0),
                        metadata={
                            "links": d.get("links", {}),
                            "images": d.get("images", {}),
                            "description": d.get("description", ""),
                        },
                    )
                else:
                    return ScraperResult(
                        url=url,
                        content="",
                        status_code=data.get("code", 500),
                        error=f"Jina API error: code={data.get('code')}, status={data.get('status')}",
                    )

        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8")[:500]
            except Exception:
                pass
            return ScraperResult(
                url=url,
                content="",
                status_code=e.code,
                error=f"HTTP {e.code}: {e.reason}. {body_text}",
            )
        except urllib.error.URLError as e:
            return ScraperResult(
                url=url,
                content="",
                status_code=0,
                error=f"URL error: {e.reason}",
            )
        except Exception as e:
            return ScraperResult(
                url=url,
                content="",
                status_code=0,
                error=f"Unexpected error: {type(e).__name__}: {e}",
            )

    def test_connection(self) -> bool:
        """Test the API key with a simple request."""
        result = self.fetch_page(
            "https://example.com",
            use_browser=False,
            timeout=10,
        )
        if result.ok:
            print(f"Jina AI connection OK. Tokens used: {result.tokens_used}")
            return True
        else:
            print(f"Jina AI connection FAILED: {result.error}")
            return False

"""
RaceDayAI - Scraper Factory
=============================
Single entry point for creating scrapers. Change the provider here
and all downstream scripts automatically use the new one.

Usage:
    from scrapers import create_scraper

    scraper = create_scraper()  # Uses default provider + env key
    scraper = create_scraper(provider="jina", api_key="jina_xxx")
    scraper = create_scraper(provider="firecrawl", api_key="fc_xxx")
"""

import os
from .base import BaseScraper, ScraperResult
from .jina_scraper import JinaScraper
from .firecrawl_scraper import FirecrawlScraper

# ── Default provider ──────────────────────────────────────────────
# Change this to swap all scripts to a different provider at once
DEFAULT_PROVIDER = "jina"

# ── Environment variable names per provider ───────────────────────
ENV_KEYS = {
    "jina": "JINA_API_KEY",
    "firecrawl": "FIRECRAWL_API_KEY",
}

# ── Provider class registry ───────────────────────────────────────
PROVIDERS = {
    "jina": JinaScraper,
    "firecrawl": FirecrawlScraper,
}


def create_scraper(
    provider: str | None = None,
    api_key: str | None = None,
    **kwargs,
) -> BaseScraper:
    """
    Factory function to create a scraper instance.

    Args:
        provider: "jina" or "firecrawl" (defaults to DEFAULT_PROVIDER)
        api_key: API key (defaults to reading from environment)
        **kwargs: Additional options passed to the scraper constructor

    Returns:
        A BaseScraper implementation ready to use

    Raises:
        ValueError: If provider is unknown or API key is missing
    """
    provider = provider or DEFAULT_PROVIDER

    if provider not in PROVIDERS:
        raise ValueError(
            f"Unknown provider: {provider}. "
            f"Available: {', '.join(PROVIDERS.keys())}"
        )

    if not api_key:
        env_var = ENV_KEYS.get(provider, "")
        api_key = os.environ.get(env_var, "")

    if not api_key:
        raise ValueError(
            f"No API key for {provider}. "
            f"Set {ENV_KEYS.get(provider, '???')} environment variable "
            f"or pass api_key= parameter."
        )

    cls = PROVIDERS[provider]
    return cls(api_key=api_key, **kwargs)


__all__ = [
    "create_scraper",
    "BaseScraper",
    "ScraperResult",
    "JinaScraper",
    "FirecrawlScraper",
]

"""Simple in-memory rate limiter keyed by client IP."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass
from threading import Lock
from typing import Deque, Dict

from fastapi import HTTPException, status

from .settings import get_settings


@dataclass
class RateLimiter:
  max_requests: int
  window_seconds: int

  def __post_init__(self) -> None:
    self._hits: Dict[str, Deque[float]] = {}
    self._lock = Lock()

  def allow(self, key: str) -> bool:
    now = time.monotonic()
    cutoff = now - self.window_seconds
    with self._lock:
      history = self._hits.setdefault(key, deque())
      while history and history[0] < cutoff:
        history.popleft()
      if len(history) >= self.max_requests:
        return False
      history.append(now)
      return True


_rate_limiter: RateLimiter | None = None
_limiter_signature: tuple[int, int] | None = None


def get_rate_limiter() -> RateLimiter:
  global _rate_limiter, _limiter_signature
  settings = get_settings()
  signature = (settings.request_limit, settings.request_window_seconds)
  if _rate_limiter is None or _limiter_signature != signature:
    _rate_limiter = RateLimiter(*signature)
    _limiter_signature = signature
  return _rate_limiter


def enforce_rate_limit(client_key: str) -> None:
  limiter = get_rate_limiter()
  if not limiter.allow(client_key):
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate limit exceeded")

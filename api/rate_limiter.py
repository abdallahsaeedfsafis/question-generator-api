"""
rate_limiter.py
بيحمي الـ API من الاستغلال:
- كل IP عنده حد أقصى من الطلبات خلال نافذة زمنية
- لو تجاوز الحد → 429 Too Many Requests
- البيانات بتتخزن بالذاكرة (مناسب للـ development)
"""

import time
from collections import defaultdict
from fastapi import Request, HTTPException
from .config import RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW


class RateLimiter:
    """
    Sliding Window Rate Limiter
    بيحفظ timestamps الطلبات لكل IP
    وبيشيل القديمة اللي خرجت من النافذة الزمنية
    """

    def __init__(self):
        # dict: IP → list of timestamps
        self.requests: dict[str, list[float]] = defaultdict(list)

    def get_client_ip(self, request: Request) -> str:
        """
        بيجيب IP الطالب
        بيتحقق من X-Forwarded-For لو في reverse proxy
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # أول IP بالقائمة هو الـ client الحقيقي
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def is_allowed(self, ip: str) -> tuple[bool, int]:
        """
        بتتحقق إذا الـ IP مسموح له بطلب جديد
        بترجع: (مسموح, عدد الطلبات المتبقية)
        """
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW

        # نشيل الطلبات القديمة خارج النافذة
        self.requests[ip] = [
            t for t in self.requests[ip]
            if t > window_start
        ]

        current_count = len(self.requests[ip])

        if current_count >= RATE_LIMIT_REQUESTS:
            remaining = 0
            return False, remaining

        # نضيف الطلب الجديد
        self.requests[ip].append(now)
        remaining = RATE_LIMIT_REQUESTS - current_count - 1
        return True, remaining

    def cleanup(self):
        """
        بتمسح IPs اللي ما عندهم طلبات — لتوفير الذاكرة
        """
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW
        to_delete = [
            ip for ip, timestamps in self.requests.items()
            if not any(t > window_start for t in timestamps)
        ]
        for ip in to_delete:
            del self.requests[ip]


# instance واحد مشترك بين كل الـ requests
limiter = RateLimiter()


async def rate_limit_middleware(request: Request):
    """
    Dependency بتنحط على أي endpoint بدك تحميه
    الاستخدام:
        @router.post("/generate", dependencies=[Depends(rate_limit_middleware)])
    """
    ip = limiter.get_client_ip(request)
    allowed, remaining = limiter.is_allowed(ip)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Max {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds.",
            headers={
                "Retry-After": str(RATE_LIMIT_WINDOW),
                "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
                "X-RateLimit-Remaining": "0",
            }
        )

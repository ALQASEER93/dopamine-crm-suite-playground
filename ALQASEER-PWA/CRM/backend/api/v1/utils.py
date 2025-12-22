from __future__ import annotations

from typing import Iterable, Tuple

from sqlalchemy.orm import Query

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 200


def clamp_page_size(page_size: int) -> int:
    return min(max(page_size, 1), MAX_PAGE_SIZE)


def paginate(query: Query, page: int, page_size: int) -> Tuple[list, int]:
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel


class IngestionResult(BaseModel):
    storage_key: str
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class IngestionProvider(ABC):
    """Abstract provider for ingesting videos from various sources."""

    @abstractmethod
    async def ingest(self, source: str, **kwargs) -> IngestionResult:
        """
        Ingest video from source (e.g. file path, uploaded chunks, URL).
        Returns IngestionResult with storage path and media metadata.
        """
        pass

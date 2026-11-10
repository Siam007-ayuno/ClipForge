import os
from typing import Optional
from app.services.ingestion.base import IngestionProvider, IngestionResult
from app.services.storage import get_storage_service


class DirectUploadProvider(IngestionProvider):
    """Handles uploaded video files."""

    def __init__(self):
        self.storage = get_storage_service()

    async def ingest(self, source: str, original_filename: str = "", **kwargs) -> IngestionResult:
        """
        source is the storage key where the file has been assembled or saved.
        """
        file_path = self.storage.get_file_path(source)
        file_size = self.storage.get_size(source)
        
        # In a real environment, ffprobe can be used to extract width, height, duration
        # Fallback values are provided if ffprobe is not yet installed
        duration = kwargs.get("duration_seconds", None)
        width = kwargs.get("width", None)
        height = kwargs.get("height", None)

        clean_filename = original_filename or os.path.basename(source)
        title = os.path.splitext(clean_filename)[0]

        return IngestionResult(
            storage_key=source,
            original_filename=clean_filename,
            file_size_bytes=file_size,
            duration_seconds=duration,
            width=width,
            height=height,
            title=title,
        )

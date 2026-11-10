from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageService(ABC):
    """Abstract interface for file storage (Local disk vs S3/R2)."""

    @abstractmethod
    def save_bytes(self, data: bytes, key: str) -> str:
        """Saves raw bytes to the specified key. Returns the storage path/key."""
        pass

    @abstractmethod
    def save_file(self, file_obj: BinaryIO, key: str) -> str:
        """Saves a file stream to the specified key. Returns the storage path/key."""
        pass

    @abstractmethod
    def append_chunk(self, key: str, chunk_data: bytes, chunk_index: int) -> int:
        """Appends a chunk to a staged file. Returns total bytes written so far."""
        pass

    @abstractmethod
    def finalize_chunked_file(self, temp_key: str, final_key: str) -> str:
        """Renames or finalizes assembled chunks to the destination key."""
        pass

    @abstractmethod
    def get_file_path(self, key: str) -> str:
        """Gets the local absolute path if available (or downloads/caches for processing)."""
        pass

    @abstractmethod
    def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Gets a download URL or relative web URL for the resource."""
        pass

    @abstractmethod
    def delete(self, key: str) -> bool:
        """Deletes the stored object/file."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Checks if a key exists in storage."""
        pass

    @abstractmethod
    def get_size(self, key: str) -> int:
        """Returns the file size in bytes."""
        pass

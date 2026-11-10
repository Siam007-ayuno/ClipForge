import os
import shutil
from typing import BinaryIO
from app.core.config import settings
from app.services.storage.base import StorageService


class LocalStorageService(StorageService):
    """Local filesystem storage implementation for development."""

    def __init__(self, base_dir: str = None):
        self.base_dir = base_dir or settings.LOCAL_STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)
        # Subdirectories for organized storage
        os.makedirs(os.path.join(self.base_dir, "temp"), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, "videos"), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, "clips"), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, "thumbnails"), exist_ok=True)

    def _resolve_path(self, key: str) -> str:
        # Prevent directory traversal attacks
        clean_key = key.replace("\\", "/").lstrip("/")
        full_path = os.path.abspath(os.path.join(self.base_dir, clean_key))
        if not full_path.startswith(os.path.abspath(self.base_dir)):
            raise ValueError("Path traversal attempt detected.")
        return full_path

    def save_bytes(self, data: bytes, key: str) -> str:
        dest_path = self._resolve_path(key)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(data)
        return key

    def save_file(self, file_obj: BinaryIO, key: str) -> str:
        dest_path = self._resolve_path(key)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        return key

    def append_chunk(self, key: str, chunk_data: bytes, chunk_index: int) -> int:
        """
        Stores chunks in temp folder: temp/<upload_id>/chunk_<index>.part
        """
        chunk_key = f"temp/{key}/chunk_{chunk_index:06d}.part"
        dest_path = self._resolve_path(chunk_key)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(chunk_data)
        return len(chunk_data)

    def finalize_chunked_file(self, temp_key: str, final_key: str) -> str:
        """
        Merges all chunk parts in temp/<temp_key>/ into destination final_key.
        """
        temp_dir = self._resolve_path(f"temp/{temp_key}")
        final_path = self._resolve_path(final_key)
        os.makedirs(os.path.dirname(final_path), exist_ok=True)

        if not os.path.isdir(temp_dir):
            raise FileNotFoundError(f"Chunk directory not found: {temp_dir}")

        chunk_files = sorted(
            [f for f in os.listdir(temp_dir) if f.startswith("chunk_") and f.endswith(".part")]
        )
        if not chunk_files:
            raise ValueError("No chunks found to assemble.")

        with open(final_path, "wb") as out_f:
            for c_file in chunk_files:
                c_path = os.path.join(temp_dir, c_file)
                with open(c_path, "rb") as in_f:
                    shutil.copyfileobj(in_f, out_f)

        # Cleanup chunks directory
        shutil.rmtree(temp_dir, ignore_errors=True)
        return final_key

    def get_file_path(self, key: str) -> str:
        return self._resolve_path(key)

    def get_url(self, key: str, expires_in: int = 3600) -> str:
        # In local dev, serve via FastAPI /static or endpoint
        clean_key = key.replace("\\", "/").lstrip("/")
        return f"/api/v1/storage/files/{clean_key}"

    def delete(self, key: str) -> bool:
        dest_path = self._resolve_path(key)
        if os.path.isfile(dest_path):
            os.remove(dest_path)
            return True
        elif os.path.isdir(dest_path):
            shutil.rmtree(dest_path, ignore_errors=True)
            return True
        return False

    def exists(self, key: str) -> bool:
        dest_path = self._resolve_path(key)
        return os.path.exists(dest_path)

    def get_size(self, key: str) -> int:
        dest_path = self._resolve_path(key)
        if os.path.exists(dest_path):
            return os.path.getsize(dest_path)
        return 0

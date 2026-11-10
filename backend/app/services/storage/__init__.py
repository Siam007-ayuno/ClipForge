from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService
from app.services.storage.s3 import S3StorageService

_storage_instance: StorageService = None


def get_storage_service() -> StorageService:
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_TYPE == "s3" and settings.S3_ACCESS_KEY_ID:
            _storage_instance = S3StorageService()
        else:
            _storage_instance = LocalStorageService()
    return _storage_instance

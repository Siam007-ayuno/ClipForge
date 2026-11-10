from app.services.ingestion.base import IngestionProvider, IngestionResult
from app.services.ingestion.direct_upload import DirectUploadProvider
from app.services.ingestion.youtube import YouTubeIngestionProvider

_providers = {
    "direct_upload": DirectUploadProvider,
    "youtube": YouTubeIngestionProvider,
}


def get_ingestion_provider(provider_name: str) -> IngestionProvider:
    provider_cls = _providers.get(provider_name.lower())
    if not provider_cls:
        raise ValueError(f"Unknown ingestion provider: {provider_name}")
    return provider_cls()

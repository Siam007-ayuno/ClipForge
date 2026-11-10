import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import BinaryIO
from app.core.config import settings
from app.services.storage.base import StorageService


class S3StorageService(StorageService):
    """S3 and Cloudflare R2 compatible storage implementation."""

    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        s3_kwargs = {
            "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
            "config": Config(signature_version="s3v4"),
        }
        if settings.S3_ENDPOINT_URL:
            s3_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        if settings.S3_REGION:
            s3_kwargs["region_name"] = settings.S3_REGION

        self.client = boto3.client("s3", **s3_kwargs)

    def save_bytes(self, data: bytes, key: str) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def save_file(self, file_obj: BinaryIO, key: str) -> str:
        self.client.upload_fileobj(file_obj, self.bucket, key)
        return key

    def append_chunk(self, key: str, chunk_data: bytes, chunk_index: int) -> int:
        part_key = f"temp/{key}/chunk_{chunk_index:06d}.part"
        self.client.put_object(Bucket=self.bucket, Key=part_key, Body=chunk_data)
        return len(chunk_data)

    def finalize_chunked_file(self, temp_key: str, final_key: str) -> str:
        # List parts and concatenate or multipart upload
        prefix = f"temp/{temp_key}/"
        response = self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        objects = response.get("Contents", [])
        objects.sort(key=lambda x: x["Key"])

        # Create multipart upload on S3/R2
        mpu = self.client.create_multipart_upload(Bucket=self.bucket, Key=final_key)
        mpu_id = mpu["UploadId"]
        parts = []

        try:
            for idx, obj in enumerate(objects, start=1):
                part = self.client.upload_part_copy(
                    Bucket=self.bucket,
                    Key=final_key,
                    PartNumber=idx,
                    UploadId=mpu_id,
                    CopySource={"Bucket": self.bucket, "Key": obj["Key"]},
                )
                parts.append({"PartNumber": idx, "ETag": part["CopyPartResult"]["ETag"]})

            self.client.complete_multipart_upload(
                Bucket=self.bucket,
                Key=final_key,
                UploadId=mpu_id,
                MultipartUpload={"Parts": parts},
            )

            # Cleanup temp parts
            delete_keys = [{"Key": obj["Key"]} for obj in objects]
            self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": delete_keys})
            return final_key
        except Exception as e:
            self.client.abort_multipart_upload(Bucket=self.bucket, Key=final_key, UploadId=mpu_id)
            raise e

    def get_file_path(self, key: str) -> str:
        # For worker rendering, download to local cache directory if needed
        local_cache = os.path.join(settings.LOCAL_STORAGE_DIR, "cache", key)
        if not os.path.exists(local_cache):
            os.makedirs(os.path.dirname(local_cache), exist_ok=True)
            self.client.download_file(self.bucket, key, local_cache)
        return local_cache

    def get_url(self, key: str, expires_in: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete(self, key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def get_size(self, key: str) -> int:
        try:
            res = self.client.head_object(Bucket=self.bucket, Key=key)
            return res.get("ContentLength", 0)
        except ClientError:
            return 0

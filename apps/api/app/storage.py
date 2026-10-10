"""Object Storage client for S3/MinIO/Cloudflare R2.

Rule 6: Direct uploads: files go to object storage through signed URLs.
File bytes never pass through the API server in direct mode.
"""

from typing import Any

import boto3
from app.config import settings
from app.logging import logger
from botocore.client import Config


class StorageClient:
    def __init__(self):
        self.endpoint_url = settings.STORAGE_ENDPOINT
        self.public_endpoint_url = settings.STORAGE_PUBLIC_ENDPOINT or settings.STORAGE_ENDPOINT
        self.bucket = settings.STORAGE_BUCKET
        self.access_key = settings.STORAGE_ACCESS_KEY
        self.secret_key = settings.STORAGE_SECRET_KEY
        self.region = settings.STORAGE_REGION

        self._s3_client = None
        self._public_s3_client = None

    @property
    def client(self):
        if self._s3_client is None:
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
        return self._s3_client

    @property
    def public_client(self):
        """Client configured for client-facing pre-signed URLs."""
        if self._public_s3_client is None:
            self._public_s3_client = boto3.client(
                "s3",
                endpoint_url=self.public_endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
        return self._public_s3_client

    def ensure_bucket_exists(self) -> None:
        """Creates bucket if it does not already exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=self.bucket)
                logger.info(f"Created storage bucket '{self.bucket}'")
            except Exception as e:
                logger.warning(f"Could not automatically create bucket '{self.bucket}': {e}")

    def generate_presigned_upload_url(
        self,
        file_key: str,
        mime: str,
        expires_in: int = 900,
    ) -> dict[str, Any]:
        """Generates a pre-signed PUT URL for client-side direct upload."""
        try:
            url = self.public_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": file_key,
                    "ContentType": mime,
                },
                ExpiresIn=expires_in,
            )
            return {
                "upload_url": url,
                "file_key": file_key,
                "expires_in": expires_in,
            }
        except Exception as e:
            logger.error(f"Failed generating presigned upload URL: {e}")
            # Fallback for dev/mock environments
            return {
                "upload_url": f"{self.public_endpoint_url}/{self.bucket}/{file_key}",
                "file_key": file_key,
                "expires_in": expires_in,
            }

    def upload_bytes(self, file_key: str, data: bytes, mime: str) -> None:
        """Uploads raw bytes to storage."""
        self.client.put_object(
            Bucket=self.bucket,
            Key=file_key,
            Body=data,
            ContentType=mime,
        )

    def download_bytes(self, file_key: str) -> bytes:
        """Downloads object bytes from storage."""
        response = self.client.get_object(Bucket=self.bucket, Key=file_key)
        return response["Body"].read()

    def delete_file(self, file_key: str) -> None:
        """Deletes file from storage."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=file_key)
        except Exception as e:
            logger.error(f"Failed to delete file '{file_key}': {e}")


storage = StorageClient()

import os
import logging
from typing import List, Optional

from services.embeddings.base import (
    EmbeddingProvider,
    TransientEmbeddingError,
    FatalEmbeddingError,
)

logger = logging.getLogger(__name__)


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model: str = "text-embedding-3-large"):
        self._model = model
        # text-embedding-3-large outputs 3072 dims; -small outputs 1536
        if model == "text-embedding-3-small":
            self._dimension = 1536
        elif model == "text-embedding-3-large":
            self._dimension = 3072
        else:
            # default to 1536 for compatibility unless overridden
            self._dimension = 1536

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self._model

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_texts(self, texts: List[str], *, user: Optional[str] = None) -> List[List[float]]:
        try:
            from openai import OpenAI
        except Exception as e:
            raise FatalEmbeddingError(f"OpenAI SDK not available: {e}")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise FatalEmbeddingError("Missing OPENAI_API_KEY")

        if not texts:
            return []

        try:
            client = OpenAI(api_key=api_key)
            response = client.embeddings.create(
                model=self._model,
                input=texts,
                user=user,
            )
            vectors = [item.embedding for item in response.data]
            return vectors
        except Exception as e:
            message = str(e).lower()
            if any(t in message for t in ["rate", "overloaded", "timeout", "temporar", "try again"]):
                raise TransientEmbeddingError(str(e))
            if any(t in message for t in ["api key", "invalid", "unauthorized", "forbidden"]):
                raise FatalEmbeddingError(str(e))
            # default transient to allow fallback
            raise TransientEmbeddingError(str(e))

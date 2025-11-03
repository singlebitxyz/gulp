import os
import logging
from typing import List, Optional

from services.embeddings.base import (
    EmbeddingProvider,
    TransientEmbeddingError,
    FatalEmbeddingError,
)

logger = logging.getLogger(__name__)


class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model: str = "text-embedding-004", target_dimension: int = 1536, on_mismatch: str = "truncate"):
        self._model = model
        self._target_dimension = target_dimension
        self._on_mismatch = on_mismatch
        # text-embedding-004 returns 3072 dims
        self._dimension = 3072 if model == "text-embedding-004" else target_dimension

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def model(self) -> str:
        return self._model

    @property
    def dimension(self) -> int:
        return self._dimension

    def _conform_dimension(self, vec: List[float]) -> List[float]:
        if len(vec) == self._target_dimension:
            return vec
        if self._on_mismatch == "truncate":
            return vec[: self._target_dimension]
        if self._on_mismatch == "pad":
            return (vec + [0.0] * self._target_dimension)[: self._target_dimension]
        # default truncate
        return vec[: self._target_dimension]

    def embed_texts(self, texts: List[str], *, user: Optional[str] = None) -> List[List[float]]:
        try:
            import google.generativeai as genai
        except Exception as e:
            raise FatalEmbeddingError(f"Google Generative AI SDK not available: {e}")

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise FatalEmbeddingError("Missing GOOGLE_API_KEY/GEMINI_API_KEY")

        if not texts:
            return []

        try:
            genai.configure(api_key=api_key)
            # Ensure model id is in the correct form for the SDK
            model_id = self._model if self._model.startswith("models/") else f"models/{self._model}"
            # Batch by looping; embed_content is per-text
            vectors: List[List[float]] = []
            for t in texts:
                res = genai.embed_content(model=model_id, content=t)
                raw = res.get("embedding") or res.get("data", [{}])[0].get("embedding")
                if isinstance(raw, dict) and "values" in raw:
                    vec = raw["values"]
                else:
                    vec = raw
                if not isinstance(vec, list):
                    raise TransientEmbeddingError("Invalid embedding response from Gemini")
                vectors.append(self._conform_dimension(vec))
            return vectors
        except Exception as e:
            message = str(e).lower()
            if any(t in message for t in ["rate", "quota", "temporar", "try again", "timeout"]):
                raise TransientEmbeddingError(str(e))
            if any(t in message for t in ["api key", "invalid", "unauthorized", "forbidden"]):
                raise FatalEmbeddingError(str(e))
            raise TransientEmbeddingError(str(e))

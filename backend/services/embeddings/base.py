from abc import ABC, abstractmethod
from typing import List, Optional


class EmbeddingError(Exception):
    """Generic embedding error."""


class TransientEmbeddingError(EmbeddingError):
    """Errors that may succeed on retry (e.g., rate limit)."""


class FatalEmbeddingError(EmbeddingError):
    """Errors that should not be retried (e.g., invalid key)."""


class EmbeddingProvider(ABC):
    """Interface for embedding providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def model(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def dimension(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def embed_texts(self, texts: List[str], *, user: Optional[str] = None) -> List[List[float]]:
        """
        Compute embeddings for a batch of texts.
        Must return one vector per input text.
        """
        raise NotImplementedError

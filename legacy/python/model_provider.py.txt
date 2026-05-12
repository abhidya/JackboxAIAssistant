"""
Model Provider Adapter for Jackbox AI Assistant

Abstracts away the specific AI model provider to support multiple backends:
- Ollama (local inference)
- NVIDIA (cloud API)
- OpenAI (cloud API)
- Anthropic (cloud API)

Example usage:
    from model_provider import get_model_provider

    provider = get_model_provider("ollama")
    response = provider.generate(
        model="llama3.1:8b",
        system_message="You are a helpful assistant",
        user_message="What is 2+2?",
        options={"temperature": 0.7}
    )
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union

from dependency_telemetry import track_dependency_call


class ModelProvider(ABC):
    @abstractmethod
    def generate(
        self,
        model: str,
        system_message: str,
        user_message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate a response from the model."""

    @abstractmethod
    def list_models(self) -> List[str]:
        """List available models for this provider."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider name (e.g., "ollama", "nvidia")."""

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model identifier."""


class ProviderError(Exception):
    def __init__(self, provider: str, message: str, original_error: Optional[Exception] = None):
        self.provider = provider
        self.message = message
        self.original_error = original_error
        super().__init__(f"{provider}: {message}")


class OllamaProvider(ModelProvider):
    def __init__(self, base_url: Optional[str] = None):
        """Initialize Ollama provider with optional custom base URL."""
        try:
            import ollama
        except ImportError:
            raise ImportError("ollama package not installed. Run: pip install ollama")

        self.base_url = base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.client = ollama.Client(host=self.base_url)

    def generate(
        self,
        model: str,
        system_message: str,
        user_message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        options = options or {}

        try:
            with track_dependency_call("ai", "generate", details=f"provider=ollama model={model}"):
                response = self.client.chat(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message},
                    ],
                    options=options,
                )
        except Exception as e:
            raise ProviderError("ollama", f"Failed to generate response: {e}", e)

        return response["message"]["content"]

    def list_models(self) -> List[str]:
        try:
            models = self.client.list()
            return [model["name"] for model in models.get("models", [])]
        except Exception as e:
            raise ProviderError("ollama", f"Failed to list models: {e}", e)

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def default_model(self) -> str:
        return os.environ.get("OLLAMA_MODEL", "llama3.1:8b")


class NvidiaProvider(ModelProvider):
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """Initialize NVIDIA provider with API key and optional base URL."""
        self.api_key = api_key or os.environ.get("NVIDIA_API_KEY")
        self.base_url = base_url or os.environ.get(
            "NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"
        )

        if not self.api_key:
            raise ProviderError(
                "nvidia", "API key not provided. Set NVIDIA_API_KEY environment variable"
            )

        try:
            import openai
        except ImportError:
            raise ImportError(
                "openai package required for NVIDIA API. Run: pip install openai"
            )

        self.client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)

    def generate(
        self,
        model: str,
        system_message: str,
        user_message: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        options = options or {}

        # Convert Ollama-style options to OpenAI format
        request_options = {
            "temperature": options.get("temperature", 0.9),
            "max_tokens": options.get("num_predict", 150),
            "top_p": options.get("top_p", 0.9),
            "stop": options.get("stop", None),
        }
        request_options = {k: v for k, v in request_options.items() if v is not None}

        try:
            with track_dependency_call("ai", "generate", details=f"provider=nvidia model={model}"):
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message},
                    ],
                    **request_options,
                )
        except Exception as e:
            raise ProviderError("nvidia", f"Failed to generate response: {e}", e)

        return response.choices[0].message.content

    def list_models(self) -> List[str]:
        # NVIDIA API doesn't expose a public models endpoint
        # Hardcoding common models from their catalog
        return [
            "meta/llama-3.3-70b-instruct",
            "meta/llama-3.1-405b-instruct",
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "google/gemma-2-27b-it",
            "microsoft/phi-3.5-vision-instruct",
        ]

    @property
    def provider_name(self) -> str:
        return "nvidia"

    @property
    def default_model(self) -> str:
        return os.environ.get("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")


class ModelProviderRegistry:
    """Registry for managing available model providers."""

    def __init__(self):
        self._providers: Dict[str, ModelProvider] = {}
        self._register_default_providers()

    def _register_default_providers(self):
        """Register providers at initialization, handling import errors gracefully."""
        try:
            self.register("ollama", OllamaProvider())
        except ImportError:
            print("Warning: Ollama provider not available (ollama package not installed)")

        try:
            self.register("nvidia", NvidiaProvider())
        except (ImportError, ProviderError) as e:
            print(f"Warning: NVIDIA provider not available: {e}")

    def register(self, name: str, provider: ModelProvider):
        self._providers[name] = provider

    def get(self, name: str) -> ModelProvider:
        if name not in self._providers:
            available = ", ".join(self._providers.keys())
            raise ProviderError(
                name, f"Provider '{name}' not found. Available: {available}"
            )
        return self._providers[name]

    def list_providers(self) -> List[str]:
        return list(self._providers.keys())

    def get_all_models(self) -> Dict[str, List[str]]:
        return {name: provider.list_models() for name, provider in self._providers.items()}


# Global registry instance
_registry = ModelProviderRegistry()


def get_model_provider(name: str) -> ModelProvider:
    """Get a model provider by name."""
    return _registry.get(name)


def get_available_providers() -> List[str]:
    """Get list of available provider names."""
    return _registry.list_providers()


def get_all_available_models() -> Dict[str, List[str]]:
    """Get all models from all providers."""
    return _registry.get_all_models()


def get_default_model() -> tuple[str, str]:
    """Get the default provider and model."""
    if "ollama" in get_available_providers():
        provider = get_model_provider("ollama")
        return ("ollama", provider.default_model)

    available = get_available_providers()
    if available:
        provider = get_model_provider(available[0])
        return (available[0], provider.default_model)

    raise ProviderError("system", "No model providers available")

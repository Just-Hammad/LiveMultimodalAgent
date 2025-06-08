from typing import Optional
from llm_service import LLMService
from service_openapi import OpenAIService
from service_gemini import GeminiService

def create_llm_service(provider: str = "openai") -> LLMService:
    """
    Factory function to create an LLM service based on the specified provider.
    
    Args:
        provider: The LLM provider to use ('openai' or 'gemini')
        api_key: Optional API key for the provider
        
    Returns:
        An instance of the appropriate LLMService implementation
        
    Raises:
        ValueError: If the provider is not supported
    """
    if provider.lower() == "openai":
        return OpenAIService()
    elif provider.lower() == "gemini":
        return GeminiService()
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}. Supported providers are: openai, gemini")

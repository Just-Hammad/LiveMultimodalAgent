import os
import base64
from typing import Dict, List, Optional, Union, Any
from openai import OpenAI, APIError
import requests
from io import BytesIO
from PIL import Image

from llm_service import LLMService

class GeminiService(LLMService):
    """
    Google Gemini implementation of the LLMService interface using the OpenAI client.
    Handles communication with Google's Gemini API through the OpenAI-compatible endpoint.
    """
    
    GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
    DEFAULT_MODEL = os.environ.get("GEMINI_DEFAULT_MODEL", "gemini-2.5-pro-preview-05-06")
    
    def __init__(self):
        """
        Initialize the Gemini service with an API key.
        
        Args:
            api_key: Gemini API key (will use environment variable if not provided)
        """
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.GEMINI_BASE_URL
        )
    
    def chat_completion(self, 
                       messages: List[Dict[str, Any]], 
                       model: Optional[str] = None,
                       temperature: Optional[float] = 0.7,
                       max_tokens: Optional[int] = None,
                       stream: bool = False) -> Union[Dict[str, Any], Any]:
        """
        Generate a chat completion using Google's Gemini API through the OpenAI client.
        
        Args:
            messages: List of message objects with role and content
            model: Gemini model to use (default: gemini-2.5-pro-preview-05-06)
            temperature: Temperature parameter (default: 0.7)
            max_tokens: Maximum number of tokens to generate
            stream: Whether to stream the response
            
        Returns:
            Either a completion response object or a stream
        """
        try:
            # Ensure we always have a model parameter
            model_name = self.DEFAULT_MODEL
            # Prepare parameters for the API call
            params = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature,
                "stream": stream
            }
            
            # Add max_tokens if provided
            if max_tokens is not None:
                params["max_tokens"] = max_tokens
                
            response = self.client.chat.completions.create(**params)
            return response
        except APIError as e:
            # Log the error and re-raise
            print(f"Gemini API Error: {str(e)}")
            raise
    
    def process_image(self, image_data: Union[str, bytes]) -> str:
        """
        Process an image for inclusion in a Gemini message.
        
        Args:
            image_data: Either a URL string or raw image bytes
            
        Returns:
            Processed image data in the format expected by Gemini
        """
        # If image_data is a URL, return it directly as Gemini supports image URLs
        if isinstance(image_data, str) and (image_data.startswith('http://') or image_data.startswith('https://')):
            return image_data
        
        # If image_data is bytes, encode as base64
        if isinstance(image_data, bytes):
            # Convert to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            return f"data:image/jpeg;base64,{base64_image}"
        
        # If it's a string but not a URL, assume it's already base64 encoded
        return image_data

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
            # Process messages to handle image URLs
            for message in messages:
                if isinstance(message.get('content'), list):
                    for content_part in message['content']:
                        if content_part.get('type') == 'image_url':
                            image_url_data = content_part.get('image_url')
                            if image_url_data and 'url' in image_url_data:
                                # Convert URL to base64 data URI
                                image_url_data['url'] = self.process_image(image_url_data['url'])
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
        # If image_data is a URL, download it.
        if isinstance(image_data, str) and (image_data.startswith('http://') or image_data.startswith('https://')):
            try:
                response = requests.get(image_data)
                response.raise_for_status()
                image_data = response.content # Now image_data is bytes
            except requests.exceptions.RequestException as e:
                print(f"Failed to download image from {image_data}: {e}")
                raise
        
        # If image_data is bytes (either originally or from a URL), encode as base64
        if isinstance(image_data, bytes):
            base64_image = base64.b64encode(image_data).decode('utf-8')
            try:
                with Image.open(BytesIO(image_data)) as img:
                    # Determine MIME type from image format, fallback to a generic one
                    mime_type = Image.MIME.get(img.format, f"image/{img.format.lower()}")
            except Exception:
                # Fallback if image format cannot be determined
                mime_type = "image/jpeg"
            return f"data:{mime_type};base64,{base64_image}"
        
        # If it's a string but not a URL, assume it's already a data URI
        return image_data

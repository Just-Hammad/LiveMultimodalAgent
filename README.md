# LiveMultimodalAgent

A multimodal AI agent that integrates voice, text, and image capabilities using ElevenLabs, OpenAI, and Google's Gemini models.

## Overview

LiveMultimodalAgent is a full-stack application that provides a conversational interface with advanced AI capabilities:

- **Voice synthesis and recognition** via ElevenLabs
- **Text processing and completion** via OpenAI and other LLM providers
- **Image analysis** capabilities with multimodal models
- **Real-time streaming** of audio responses

## Features

- Seamless integration with multiple AI providers (OpenAI, Google Gemini)
- Voice interactions powered by ElevenLabs
- Image analysis and discussion capabilities
- WebSocket-based real-time audio streaming
- Extensible architecture for adding new LLM providers
- Modern React frontend with responsive design

## Architecture

The application uses a modern web stack:

- **Frontend**: React with Vite
- **Backend**: Python Flask server
- **AI Services**: OpenAI API, ElevenLabs API, Google Gemini API

## Quick Start

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- API keys for:
  - OpenAI API
  - ElevenLabs API 
  - Google Gemini API (optional)

### Environment Configuration

1. Create a `.env` file in the project root:

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
LLM_PROVIDER=OpenAI
DEFAULT_MODEL=GPT-4o
```

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the Flask server:
```bash
python app.py
```

The backend will run on http://127.0.0.1:5003 by default.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Your application should now be running at http://localhost:3000 (or the port specified by Vite).

## Project Structure

```
app.py                  # Flask backend entry point
llm_factory.py          # Factory for creating LLM service instances
llm_service.py          # Base LLM service interface
service_claude.py       # Anthropic Claude service implementation
service_gemini.py       # Google Gemini service implementation
service_openapi.py      # OpenAI service implementation
requirements.txt        # Python dependencies
frontend/               # React frontend
  src/                  # Frontend source code
    App.jsx             # Main application component
    VoiceConnection.jsx # Voice streaming component
    components/         # UI components
```

## How It Works

1. The frontend connects to the ElevenLabs Voice API using WebSockets
2. Users can upload images for analysis or speak directly to the AI
3. The backend proxies requests to the appropriate AI provider
4. Audio responses are streamed back in real-time

## Development Guide

### Adding New LLM Providers

1. Create a new service file (e.g., `service_newprovider.py`)
2. Implement the `LLMService` interface defined in `llm_service.py`
3. Add the provider to `llm_factory.py`
4. Update the `.env` file with the new provider option

### Key Components

- **LLM Factory**: Creates the appropriate LLM service based on configuration
- **LLM Services**: Adapters for different AI providers with consistent interface
- **WebSocket Integration**: Real-time voice streaming via ElevenLabs
- **Image Processing**: Handles upload, storage, and referencing for multimodal analysis

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Security Notes

- **API Keys**: Store in `.env` file (included in `.gitignore`)
- **Image Storage**: Uploaded images are stored in `uploads/` directory
- **Environment Variables**: Protect your `.env` file with `chmod 600 .env`
- **SSL/TLS**: Required for production deployment with ElevenLabs WebSockets

## License

[MIT License](LICENSE)

## Contact

For support or inquiries, please contact the project maintainers.
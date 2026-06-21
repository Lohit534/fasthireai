---
title: FastHire-AI
emoji: ⚡
colorFrom: indigo
colorTo: teal
sdk: docker
pinned: false
license: mit
---

# FastHire-AI Python AI Microservice

This microservice acts as the analytical back-bone for FastHire-AI. It coordinates natural language processing and embeddings matching across three distinct layers.

## Tech Stack
- **FastAPI**: Asynchronous Python API routing.
- **Sentence-Transformers (Sentence-BERT)**: Semantic matching utilizing the `all-MiniLM-L6-v2` model weights.
- **spaCy**: NLP keyword extraction, bigrams mapping, and action verb validation.
- **Gemini 1.5 Flash**: Contextual resume bullet optimization.

---

## API Endpoints

### 1. GET `/health`
Returns service status checking if model weights are loaded.
- **Response**: `{"status": "healthy"}`

### 2. POST `/score`
Computes the complete ATS compatibility scorecard.
- **Body**:
```json
{
  "resume_text": "Experienced software engineer specializing in React and Node...",
  "job_description": "We are seeking a developer with knowledge of React, Node, and AWS..."
}
```
- **Response**: Mapped `ATSScore` schema variables.

### 3. POST `/optimize`
Coordinates resume bullet rewrites using Gemini 1.5 Flash.
- **Body**:
```json
{
  "resume_text": "...",
  "job_description": "...",
  "rewrite": true
}
```

### 4. POST `/extract-skills`
Runs spaCy NER and custom lookups to output a candidate's skill tags.
- **Body**: `{"resume_text": "..."}`

---

## Deployment & Setup

### Local Execution:
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```

### Docker Build:
```bash
docker build -t fasthire-ai-service .
docker run -p 7860:7860 -e GEMINI_API_KEY="your-key" fasthire-ai-service
```

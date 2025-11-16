FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY tts_service ./tts_service

EXPOSE 8750
CMD ["uvicorn", "tts_service.main:app", "--host", "0.0.0.0", "--port", "8750"]

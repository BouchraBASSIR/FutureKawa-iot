FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances en premier pour profiter du cache Docker
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY src/ .

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]

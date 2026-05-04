FROM python:3.11-slim AS backend
WORKDIR /app
COPY backend/pyproject.toml backend/README.md ./
RUN pip install --no-cache-dir -e .
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic/alembic.ini ./alembic.ini
RUN mkdir -p data/uploads

FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM backend
COPY --from=frontend-build /frontend/dist ./frontend/dist
EXPOSE 8000
CMD ["sh", "-c", "alembic -c alembic.ini upgrade head && python app/seed/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

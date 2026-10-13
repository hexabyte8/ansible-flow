FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt ansible-lint
COPY app ./app
RUN useradd -u 10001 -m app && mkdir -p /srv/data && chown -R app /srv/data
USER 10001
VOLUME /srv/data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

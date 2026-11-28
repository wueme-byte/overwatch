FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# В6: программа работает не от root. Если её когда-нибудь взломают,
# у взломщика будут права обычного пользователя, а не хозяина контейнера.
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

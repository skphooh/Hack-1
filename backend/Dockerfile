FROM python:3.11-slim

WORKDIR /app

# 依存パッケージをインストール（レイヤーキャッシュを活用）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# Railway は $PORT 環境変数でポートを渡す
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

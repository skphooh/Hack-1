"""
Render バックエンドの疎通確認スクリプト
"""
import http.client
import json

HOST = "utinoko.onrender.com"


def check_options(path):
    """OPTIONS プリフライトリクエストを送り CORS ヘッダーを確認する"""
    conn = http.client.HTTPSConnection(HOST, timeout=15)
    conn.request("OPTIONS", path, headers={
        "Origin": "https://utinoko.skphooh.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization",
    })
    res = conn.getresponse()
    h = dict(res.getheaders())
    allow_origin = h.get("access-control-allow-origin", "MISSING")
    print(f"OPTIONS {path} -> {res.status}  allow-origin={allow_origin}")
    conn.close()
    return res.status, allow_origin


def check_post_no_auth(path):
    """認証なしで POST を送り、どんなエラーが返るか確認する"""
    conn = http.client.HTTPSConnection(HOST, timeout=15)
    # 最小限のマルチパートボディを構築
    boundary = "TESTBOUNDARY"
    tiny_png = bytes([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,  # PNG シグネチャ
    ])
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="t.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + tiny_png + f"\r\n--{boundary}--\r\n".encode()

    conn.request("POST", path, body=body, headers={
        "Origin": "https://utinoko.skphooh.com",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    })
    res = conn.getresponse()
    body_text = res.read(500).decode("utf-8", errors="replace")
    print(f"POST  {path} -> {res.status}  body={body_text[:200]}")
    conn.close()
    return res.status


def check_get_with_auth(path, token="dummy_token"):
    """GET + ダミー認証トークンで叩く"""
    conn = http.client.HTTPSConnection(HOST, timeout=15)
    conn.request("GET", path, headers={
        "Origin": "https://utinoko.skphooh.com",
        "Authorization": f"Bearer {token}",
    })
    res = conn.getresponse()
    body_text = res.read(500).decode("utf-8", errors="replace")
    h = dict(res.getheaders())
    allow_origin = h.get("access-control-allow-origin", "MISSING")
    print(f"GET   {path} -> {res.status}  allow-origin={allow_origin}  body={body_text[:200]}")
    conn.close()
    return res.status


if __name__ == "__main__":
    print("=" * 60)
    print("Render バックエンド 疎通確認")
    print("=" * 60)

    # 1) ヘルスチェック
    conn = http.client.HTTPSConnection(HOST, timeout=15)
    conn.request("GET", "/health")
    res = conn.getresponse()
    print(f"GET   /health -> {res.status}  body={res.read().decode()}")
    conn.close()

    print()

    # 2) CORS プリフライト確認
    check_options("/api/depth")
    check_options("/api/generate")

    print()

    # 3) 認証なし POST（どのエラーが返るか）
    check_post_no_auth("/api/depth")
    check_post_no_auth("/api/generate")

    print()

    # 4) ダミートークンで GET（CORSヘッダーが付くか、何のエラーか）
    check_get_with_auth("/api/works")

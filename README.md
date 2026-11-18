# clue-1m-sub

App độc lập canh mốc **1.000.000 submission** của CLUE OJ (theo `MAX(id)` trên MariaDB). Astro + Docker, chạy song song với stack OJ, không đụng thư mục `clueoj/`.

## Tính năng

- **Live counter** (odometer kiểu YouTube, VI/EN, private theo token): `/?t=<ACCESS_TOKEN>`
- **Trang video**: `/video?t=<ACCESS_TOKEN>` — kích hoạt quay trên server, dừng và tải MP4/WebM. Có thể đóng tab rồi mở lại để điều khiển cùng phiên quay
- Theo dõi submission ID trong MariaDB. Từ 999.991, Playwright tự quay bộ đếm ở 1920×1080. Khi đạt 1.000.000, hệ thống ghi phần kết và xuất video.
- **Self-heal**: restart qua moments 1M vẫn dựng lại timeline từ DB và render; fail retry mỗi 10 phút
- Tối ưu CPU: poll là query O(1) (`SELECT MAX(id)`), trang chỉ poll khi tab visible, render 1 lần duy nhất với `cpus: 2`

## Cấu trúc

```
app/                  # Astro app (adapter node standalone)
  server/             # poller, db pool, schedule builder, audio synth, render orchestrator
  src/                # pages (/, /replay, /video), API, middleware token, UI
docker-compose.yml    # container duy nhất, attach external network dmoj_db
.env.example          # template cấu hình (DB read-only user + ACCESS_TOKEN)
```

## Deploy

```sh
cp .env.example .env    # điền MYSQL_PASSWORD + ACCESS_TOKEN
# đồng bộ source lên VPS bằng phương thức riêng của bạn (rsync/scp) rồi:
docker compose up -d --build
```

Điều khiển quay tay (quay ngay từ số sub hiện tại, tự chạy finale khi tới 1M):

```sh
curl -X POST "http://<host>:8642/api/render?t=<TOKEN>"              # bắt đầu
curl -X POST "http://<host>:8642/api/render?t=<TOKEN>&action=stop"  # dừng + lưu
```

Render thật tự kích hoạt khi `MAX(id) >= 999.991` và quay live đến khi chạm 1.000.000.

## Yêu cầu DB

User MySQL read-only (`SELECT` trên database OJ), join `judge_submission` + `auth_user` + `judge_problem` + `judge_language`.

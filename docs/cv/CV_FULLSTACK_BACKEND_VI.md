# [HỌ VÀ TÊN]

**Lập trình viên Full-Stack / Backend Junior**  
TP. Hồ Chí Minh, Việt Nam | [số điện thoại] | [email] | [GitHub] | [LinkedIn/Upwork]

## Tóm Tắt

Lập trình viên junior có kinh nghiệm thực hành qua các dự án web full-stack, bao gồm frontend, backend, database, Docker và deploy cloud. Đã làm việc với React/Next.js, Spring Boot, FastAPI, MySQL, PostgreSQL, Redis, RabbitMQ, Docker, GitHub Actions và Azure Container Apps.

Tôi tập trung vào các công việc kỹ thuật thực tế: sửa bug API, tối ưu truy vấn database, cấu hình Docker, deploy service, viết tài liệu kỹ thuật và test các luồng người dùng quan trọng. Tôi vẫn đang tiếp tục học và phát triển, nhưng làm việc cẩn thận, giao tiếp rõ ràng và có khả năng lần theo lỗi từ frontend đến backend, database và hạ tầng deploy.

## Kỹ Năng Kỹ Thuật

**Frontend:** React, Next.js, TypeScript, Tailwind CSS, React Query  
**Backend:** Spring Boot, FastAPI, REST API, JWT authentication, phân quyền theo role  
**Database:** MySQL, PostgreSQL, SQL indexing, phân tích query, `EXPLAIN ANALYZE`  
**Infrastructure:** Docker, Docker Compose, Nginx gateway, Azure Container Apps, Azure Container Registry  
**Async & Cache:** Redis, RabbitMQ, Celery, background worker, cache invalidation cơ bản  
**Công cụ:** Git, GitHub Actions, smoke test, API testing, viết tài liệu kỹ thuật

## Dự Án

### EduMatch - Hệ Thống Microservices Cho Học Bổng Và Matching

Xây dựng và tối ưu hệ thống nền tảng giáo dục gồm các luồng student, provider và admin.

- Phát triển và debug các luồng frontend bằng React/Next.js: danh sách học bổng, đăng nhập/đăng ký, dashboard, nộp đơn, chat và notification.
- Làm việc với các Spring Boot service cho authentication, quản lý học bổng, applications, bookmarks, provider analytics và admin moderation.
- Cải tiến matching service bằng FastAPI và PostgreSQL read model, gồm rule-based scoring, batch scoring, recommendation cache và worker precompute.
- Tối ưu database bằng cách tạo load-test data, phân tích slow query với `EXPLAIN ANALYZE`, thêm index cho scholarship list, application count và bookmark lookup.
- Giảm nguy cơ FE/API fan-out bằng batch endpoint, chuẩn hóa API response, pagination cap và cache boundary.
- Lập kế hoạch Redis cache cho public scholarship list/detail và analytics, đồng thời tránh cache sai dữ liệu cá nhân như match score/bookmark/applied status.
- Deploy staging lên Azure Container Apps với Docker image, Azure Container Registry, Nginx gateway, GitHub Actions CI/CD, smoke test, rollback workflow và App Insights observability.
- Debug các lỗi deploy thực tế: CORS khi register, backend unavailable, Redis/RabbitMQ internal TCP routing, old active revisions, cold start và scale-down để tiết kiệm cloud credit.
- Viết tài liệu kỹ thuật: API standardization guide, DB optimization report, cache layer plan, deployment guide, maintenance runbook, performance incident report và QA checklist.

**Công nghệ:** React, Next.js, Spring Boot, FastAPI, MySQL, PostgreSQL, Redis, RabbitMQ, Docker, Nginx, Azure Container Apps, GitHub Actions

### Doc Automation Engine - Hệ Thống Bóc Tách Báo Cáo PDF Và Xuất Word

Phân tích và làm việc với hệ thống tự động hóa tài liệu dùng để bóc tách dữ liệu có cấu trúc từ báo cáo PDF, review kết quả, tổng hợp báo cáo ngày và xuất file Word theo template.

- Review kiến trúc FastAPI gồm các lớp API, application service, domain model, infrastructure, extraction engine và worker task.
- Làm việc với pipeline xử lý tài liệu hai bước: deterministic PDF parsing bằng `pdfplumber` và regex, sau đó có optional LLM enrichment chạy bất đồng bộ.
- Review thiết kế Celery worker với Redis queue cho extraction, enrichment, document processing và scheduled background jobs.
- Phân tích PostgreSQL JSONB model cho extraction jobs, data priority rules và rủi ro migration khi schema được sửa lúc startup.
- Review luồng lưu trữ tài liệu bằng MinIO/S3-compatible: upload, checksum deduplication, download và Word template export.
- Phát hiện các điểm cần harden trước production: thiếu frontend API library trong repo, default development secrets, wildcard CORS, startup DDL changes, thiếu CI, N+1 query khi list member và endpoint extraction nặng chạy trực tiếp trong request path.
- Đề xuất cải tiến về security hardening, Alembic migration, CI validation, xử lý file an toàn theo tenant và đưa các tác vụ nặng về background worker.

**Công nghệ:** FastAPI, Celery, Redis, PostgreSQL, SQLAlchemy, MinIO, pdfplumber, docxtpl, Docker Compose, Next.js

## Công Việc Kỹ Thuật Tiêu Biểu

- Tối ưu database: tạo seed/load-test data, thêm composite index, so sánh query plan trước/sau và viết báo cáo kết quả.
- Thiết kế API: chuẩn hóa `/api/v1` contract, pagination, error response, batch endpoint, idempotency note và performance budget.
- Deploy cloud: cấu hình Azure Container Apps staging, set secrets, deploy services, xem logs, smoke test endpoints và viết runbook rollback/bảo trì.
- QA/debugging: test các luồng guest, student, provider, admin, chat, notification và matching; ghi lại bug và cách khắc phục.

## Học Vấn

[Tên trường] - [Ngành học / Bằng cấp]  
[Năm tốt nghiệp dự kiến hoặc năm tốt nghiệp]

## Định Hướng

Tìm cơ hội junior full-stack, backend, API development, bug fixing, Docker deployment và database optimization.

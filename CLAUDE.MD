# Project Overview
Hệ thống tự động hóa quy trình seeding video trên Facebook (End-to-End). Hỗ trợ quản lý hàng nghìn tài khoản (Via/Clone), xử lý video tập trung và điều phối chiến dịch thông minh qua kiến trúc bất đồng bộ (Asynchronous).
Architecture: Micro-services / Task-based Architecture.
Primary Focus: Facebook Graph API & Marketing API integration.
Concurrency Model: FastAPI (Async) + Celery Workers (Distributed).

# Tech Stack
Backend	Python 3.10+, FastAPI, SQLAlchemy (ORM), Pydantic v2
Frontend	Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
Task Queue	Celery + Redis (Message Broker)
Database	PostgreSQL 15+ (Main), Redis (Cache/Session)
Storage	S3-Compatible (AWS S3 or MinIO)
Media Engine	FFmpeg (via Python-FFmpeg)


# Project Structure & Context
## Backend (/backend)
Cấu trúc theo mô hình Service-Oriented:
app/api/: Định nghĩa các Router và Endpoints.
app/models/: Định nghĩa Database Schema (SQLAlchemy).
app/schemas/: Định nghĩa Pydantic models (Data Validation).
app/services/: Nơi chứa Business Logic chính (Xử lý Facebook API, Seeding logic).
app/tasks/: Định nghĩa các Celery tasks (Upload, Analytics collection).

## Frontend (/frontend)
Cấu trúc Next.js 14 App Router:
src/app/: File-based routing (Dashboard, Videos, Campaigns).
src/components/: UI Components (Atomic design).
src/lib/: API Client (Axios/Fetch) và Type definitions.

## Core Workflows (AI Context)
Video Pipeline:
Upload -> S3 Storage -> Celery Task (FFmpeg) -> PostgreSQL Update.

Seeding Execution:
Fetch Campaign -> Pick Account + Proxy -> Rotate IP -> Facebook API Call -> Logging.

Safety Mechanism:
Sử dụng Proxy Isolation: Mỗi account gắn với 1 Proxy IP cố định.
Human-like delay: Random jitter giữa các request.
Encryption: Token/Cookie luôn được mã hóa trước khi lưu DB.

# Development Guidelines
Backend Rules:
Style: Tuân thủ PEP 8. Luôn sử dụng Type Hints.
Async: Sử dụng async def cho các API endpoints. Các tác vụ nặng (I/O, Video) phải đẩy vào tasks/.
Validation: Luôn dùng Pydantic để validate Request Body và Response.
DB: Sử dụng Alembic cho mọi thay đổi Schema.

Frontend Rules:
Components: Ưu tiên Server Components. Chỉ dùng Client Components ('use client') khi cần tương tác (Form, Chart).
TypeScript: Tuyệt đối không dùng any. Định nghĩa Interface/Type rõ ràng trong lib/types.ts.
State: Sử dụng React Query (TanStack Query) cho việc fetch + caching dữ liệu API.

# Security & Constraints
Multi-tenant: Đảm bảo Query luôn lọc theo user_id.
Rate Limit: Tuân thủ Facebook API Limits (implement Exponential Backoff).


# Commands for AI Agent
Install Backend: pip install -r requirements.txt
Run API: uvicorn app.main:app --reload
Run Worker: celery -A app.tasks.celery_app worker --loglevel=info
Install Frontend: npm install
Run Frontend: npm run dev

# Tài liệu này là nguồn sự thật duy nhất (Single Source of Truth) về cấu trúc hệ thống. Khi code, hãy ưu tiên tuân thủ các quy tắc trong Service Layer và Task Orchestration.

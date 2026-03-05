<div align="center">
  <img width="1200" height="475" alt="DocuFlow Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DocuFlow

문서 작업을 빠르게 처리하기 위한 웹 기반 PDF/문서 유틸리티입니다.  
병합, 분할, 변환, OCR, 보안(잠금/해제), 워터마크, 서명 등 실무에서 자주 쓰는 기능을 한 곳에서 제공합니다.

## UI 미리보기

<div align="center">
  <img width="1200" height="475" alt="DocuFlow Main UI" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 데모 플로우

- `Merge Files`: 여러 PDF/이미지를 하나의 PDF로 통합
- `OCR Reader`: 스캔 문서/이미지 텍스트를 Markdown으로 추출
- `EPUB to PDF`: 전자책 EPUB를 공유 가능한 PDF로 변환
- `Protect/Unlock`: 배포 전 문서 보안 설정 및 해제 작업

## 핵심 기능

- PDF 편집: `Merge`, `Split`, `Organize`, `Compress`, `Page Numbers`, `Annotate`
- PDF 보안: `Protect PDF`, `Unlock PDF`, `Watermark`, `Sign & Stamp`
- 포맷 변환: `PDF ↔ DOCX`, `PDF → Markdown`, `EPUB → PDF`, `JPG ↔ PDF`
- OCR: 이미지/PDF 기반 텍스트 추출 (로컬 OCR 파이프라인, 웹에서 OpenRouter 보완 경로 사용 가능)
- 진행 상태 UI: 긴 작업에서 단계별 진행률/상태 안내

## 기술 스택

- Frontend: `React 19`, `TypeScript`, `Vite`, `React Router`
- UI: `Tailwind CSS`, `lucide-react`
- 문서 처리: `pdf-lib`, `pdfjs-dist`, `docx`, `mammoth`, `jszip`
- OCR: 로컬 텍스트 추출 기본 동작 + 웹에서 OpenRouter 기반 OCR 보완 모드 사용 가능
- Headless PDF 렌더링 서버(선택): `Express`, `Playwright`
- PWA: `vite-plugin-pwa`, `workbox-window`

## 성능/사용성 포인트

- Lazy loading: 각 도구 페이지를 동적 로딩해 초기 진입 속도 개선
- Manual chunks: React, Router, PDF, Office 라이브러리 청크를 분리해 캐시 효율 개선
- 작업 피드백: 변환/추출 중 진행률, 상태 메시지, ETA 표시
- 대용량 대응: OCR 배치 처리 + 재시도 로직(네트워크/서버/Rate limit 대응)
- 브라우저 우선 처리: 파일을 가능한 클라이언트에서 처리해 사용 흐름 단순화

## 빠른 시작

### 1) 요구 사항

- Node.js 18+
- pnpm 권장 (npm도 가능)

### 2) 의존성 설치

```bash
pnpm install
```

### 3) 환경 변수 설정

`.env.example`을 복사해 `.env` 또는 `.env.local`을 만듭니다.

```bash
cp .env.example .env
```

선택 변수:

```env
# OpenRouter OCR (웹 보완 모드, 선택)
VITE_OPENROUTER_API_KEY=your_api_key_here
# 선택: 기본 OCR 모델
VITE_OPENROUTER_MODEL=google/gemma-3-27b-it:free

# 일부 기존 코드 경로 호환용
GEMINI_API_KEY=your_gemini_api_key
```

### 4) 개발 서버 실행

```bash
pnpm dev
```

기본 접속: `http://localhost:3000`

## 선택 기능: Headless PDF 서버

Markdown/HTML 기반 PDF 렌더링 정확도를 높이려면 별도 서버를 같이 실행하세요.

```bash
pnpm pdf-server
```

- 기본 포트: `4177`
- 환경 변수로 변경 가능: `PDF_SERVER_PORT=4178`
- Vite dev server는 `/api`를 `http://127.0.0.1:4177`로 프록시합니다.

Playwright 브라우저가 없다는 오류가 나오면:

```bash
pnpm exec playwright install chromium
```

## 스크립트

- `pnpm dev`: 프론트 개발 서버
- `pnpm pdf-server`: Headless PDF 렌더링 서버
- `pnpm build`: 프로덕션 빌드
- `pnpm preview`: 빌드 결과 로컬 미리보기

## 사용 가이드

1. 메인 페이지에서 원하는 도구 선택
2. 파일 업로드
3. 옵션 설정(페이지 범위, 품질, 보안 비밀번호, OCR 설정/모델 등)
4. 실행 후 결과 다운로드

### OCR 팁

- 스캔 품질이 낮을수록 정확도가 떨어집니다.
- 다중 페이지 이미지의 경우 페이지 구분이 뚜렷하면 인식 품질이 좋아집니다.
- Rate limit/네트워크 오류 시 자동 재시도 후 실패 원인을 구분해서 표시합니다.

### EPUB 변환 팁

- EPUB 내부 구조(챕터, CSS, 이미지)에 따라 결과 레이아웃 차이가 날 수 있습니다.
- 이미지 누락, 챕터 누락 등을 진단 정보로 집계해 후속 점검이 가능합니다.

## 프로젝트 구조 (요약)

```text
DocuFlow/
  App.tsx
  src/
    components/
      Layout.tsx
      Shared.tsx
      ProgressSteps.tsx
    pages/
      PdfTools.tsx
      OfficeTools.tsx
      ProtectTool.tsx
      SignTool.tsx
      WatermarkTool.tsx
  services/
    pdfUtils.ts
    officeUtils.ts
    openRouterService.ts
    pdfOCRExtractor.ts
  server/
    pdf-server.mjs
```

## 배포 가이드

- 정적 프론트만 배포: `pnpm build` 후 `dist/` 배포
- OCR 고정밀 웹 모드 사용 시: `VITE_OPENROUTER_API_KEY` 설정 필요
- Headless PDF 서버 사용 시: `server/pdf-server.mjs`를 별도 Node 런타임으로 배포

## 트러블슈팅

- `OpenRouter API Key가 설정되지 않았습니다`
  - `.env(.local)`에 `VITE_OPENROUTER_API_KEY` 확인 (웹 OCR 보완 모드 사용 시 필요)
- `Playwright browser is missing`
  - `pnpm exec playwright install chromium` 실행
- `/api` 호출 실패
  - `pnpm pdf-server` 실행 여부, 포트(`4177`) 충돌 여부 확인

## 라이선스 / 고지

- 개인/팀 생산성 향상을 위한 문서 처리 도구입니다.
- 포함된 샘플 문서/리소스 사용 시 원저작권 및 라이선스를 확인하세요.

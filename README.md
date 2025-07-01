# Homepage NestJS 서버

## 소개

이 프로젝트는 [NestJS](https://nestjs.com/) 프레임워크를 기반으로 한 서버 애플리케이션으로, 효율적이고 확장 가능한 서버 애플리케이션을 구축하기 위해 설계되었습니다. 주요 기능으로는 사용자 인증, 뉴스 관리, 게임 콘텐츠 관리, 프로모션 배너 관리, 파일 업로드, 회사 정보 관리 등이 포함됩니다.

---

## 주요 기능

### 사용자 인증
- JWT 기반 인증 및 토큰 관리
- 로그인 및 회원가입 기능
- 토큰 만료 및 유효성 검사

### 뉴스 관리
- 뉴스 생성, 수정, 삭제
- 뉴스 순서 변경 및 페이지네이션
- 공개 뉴스 리스트 및 상세 조회

### 게임 콘텐츠 관리
- 게임 뉴스 생성, 수정, 삭제
- 게임 순서 변경 및 페이지네이션
- 공개 게임 리스트 및 상세 조회

### 프로모션 배너 관리
- 프로모션 배너 생성, 수정, 삭제
- 임시 저장(드래프트) 관리
- 배너 활성화 및 비활성화

### 파일 업로드
- 로컬 스토리지 기반 파일 업로드
- 업로드된 파일의 URL 반환 및 데이터베이스 저장

### 회사 정보 관리
- 회사 정보 생성 및 수정
- 단일 회사 정보 조회

---

## 프로젝트 설정

### 설치

```bash
$ npm install
```

### 실행

#### 개발 환경
```bash
$ npm run start
```

#### 실시간 변경 감지 모드
```bash
$ npm run start:dev
```

#### 프로덕션 환경
```bash
$ npm run start:prod
```

---

## 테스트

### 유닛 테스트
```bash
$ npm run test
```

### E2E 테스트
```bash
$ npm run test:e2e
```

### 테스트 커버리지 확인
```bash
$ npm run test:cov
```

---

## API 문서

Swagger를 통해 API 문서를 제공합니다. 서버 실행 후 아래 URL에서 확인할 수 있습니다:

```
http://localhost:<PORT>/docs
```

---

## 배포

프로덕션 환경으로 배포하려면 [NestJS 배포 문서](https://docs.nestjs.com/deployment)를 참고하세요.

---

## 디렉토리 구조

### 주요 디렉토리
- **src**: 애플리케이션의 주요 소스 코드
  - `auth`: 사용자 인증 관련 모듈
  - `news`: 뉴스 관리 모듈
  - `games`: 게임 콘텐츠 관리 모듈
  - `promotions`: 프로모션 배너 관리 모듈
  - `uploadfile`: 파일 업로드 관련 모듈
  - `company`: 회사 정보 관리 모듈
  - `hero`: 히어로 관리 모듈
- **libs**: 공통 라이브러리 및 유틸리티
  - `core`: 환경 설정, 로깅 등 핵심 기능
  - `database`: 데이터베이스 연결 및 서비스
  - `storage`: 파일 저장 어댑터
- **prisma**: Prisma ORM 관련 설정 및 스키마
  - `schema.prisma`: 데이터베이스 스키마 정의
  - `seed.ts`: 초기 데이터 설정

---

## 환경 변수

`.env` 파일을 사용하여 환경 변수를 설정합니다. 주요 변수는 다음과 같습니다:

- `APP_PORT`: 서버 포트 (기본값: 8080)
- `DB_URL`: 데이터베이스 연결 URL
- `JWT_SECRET`: JWT 토큰 비밀 키
- `REFRESH_TOKEN_SECRET`: 리프레시 토큰 비밀 키

아래는 사용 가능한 전체 환경 변수 목록 예시입니다.

```
# PORT 및 오리진
APP_PORT=
ORIGINS=

# JWT 관련
JWT_SECRET=
JWT_EXPIRES_IN=
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRES_IN=

# 데이터베이스 설정
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_URL=

# 로깅
LOG_LEVEL=

# 스토리지 (AWS S3)
AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# CloudFront
CLOUDFRONT_DOMAIN=
```

각 변수는 서비스 환경에 맞게 값을 설정해 주세요.

---

## 라이센스

이 프로젝트는 [MIT 라이센스](https://opensource.org/licenses/MIT)를 따릅니다.
# k8s-multi-cloud-monitor

여러 클라우드에 흩어진 쿠버네티스 클러스터를 등록하고, CPU, 메모리, 파드, 노드 지표를 한 화면에서 보는 웹 앱입니다.
앱(NestJS, Next.js)과 그 앱이 돌아갈 네이버 클라우드(NCP) 인프라(Terraform, NKS)를 혼자 만들었습니다. (2025.10)

포트폴리오 설명: <https://woosupar.dev/projects/k8s-multi-cloud-monitor/>

## 구성

```
사용자
  │
  ├─▶ 프론트엔드 (Next.js 정적 export)
  │     NCP Object Storage 정적 호스팅
  │
  └─▶ API (Ingress, ALB, HTTPS 443)
        │
        ▼
     NKS 클러스터 ── 백엔드 (NestJS) ──▶ Cloud DB for PostgreSQL
                         │
                         └─▶ 등록된 각 클러스터의 Kubernetes API (CoreV1)
```

## 무엇을 하나

- **클러스터 등록:** 이름, 프로바이더, API 엔드포인트, 리전, 접근 토큰을 등록합니다.
- **지표 수집:** 백엔드가 1분마다 등록된 모든 클러스터에서 노드와 파드 정보를 읽어 DB에 쌓습니다. 한 클러스터에서 실패해도 나머지는 계속 수집합니다.
- **대시보드:** 프로바이더와 기간(기본 12시간)을 골라 지표 카드와 추이 그래프를 봅니다.
- **로그인:** JWT 기반 인증입니다.

## 설계에서 신경 쓴 점

### 클러스터 토큰은 암호화해서 저장한다

등록한 클러스터의 접근 토큰은 그 클러스터를 다룰 수 있는 열쇠입니다. DB에는 AES-256-GCM으로 암호화해서 저장하고(`backend/src/common/encryption.service.ts`), 엔티티에서는 `select: false`로 두어 일반 조회 결과에 섞여 나오지 않게 했습니다.

### 백엔드가 여러 개여도 수집은 한 번만 한다

백엔드 파드가 여러 개 뜨면 모든 파드에서 1분짜리 수집 작업이 돌아 같은 지표가 중복으로 쌓였습니다. 수집을 시작할 때 PostgreSQL advisory lock(`pg_try_advisory_lock`)을 잡고, 잠금을 못 잡은 파드는 그 회차를 건너뛰게 해서 해결했습니다.

### 이상값은 조회할 때 거른다

CPU와 메모리 사용률은 0에서 100 사이 값만 그래프에 씁니다.

## 인프라 (`infra/`)

Terraform으로 NCP에 다음을 만듭니다.

| 파일 | 내용 |
|---|---|
| `network.tf` | VPC, 서브넷(로드밸런서용 공개와 사설, 워크로드용 사설), NAT 게이트웨이, 라우트 테이블, 네트워크 ACL |
| `nks.tf` | NKS 클러스터와 노드 풀(노드 2대, KR-1 존) |
| `db.tf` | Cloud DB for PostgreSQL |
| `init.tf` | 프로바이더 설정, Object Storage에 둔 Terraform 상태 |

### Terraform 밖에서 손으로 한 것

NCP에서는 일부를 Terraform으로 만들 수 없거나, 만들어도 추가 작업이 필요했습니다. 다시 구축할 때 빠뜨리지 않으려고 기록해 둡니다(`infra/todo`).

- DB에 붙은 ACG에 접근 권한 추가
- PostgreSQL 스키마와 권한 설정 (별도 서버에서 DB에 접속해서 생성)
- `ncp-iam-authenticator`를 설치해 kubeconfig를 만들고 `kubectl` 사용
- Container Registry를 콘솔에서 만들고 Object Storage와 연결
- Object Storage 정적 호스팅 설정
- 공개 서브넷에 인그레스 컨트롤러를 로드밸런서 유형으로 배포하고, 로드밸런서에 ACL 설정

## CI/CD (`.github/workflows/`)

`develop` 브랜치에 push하면 바뀐 쪽만 배포됩니다.

- **백엔드** (`backend/` 변경 시): Docker 이미지를 빌드해 NCP Container Registry에 올리고, 매니페스트의 이미지 태그를 바꿔 `kubectl apply`, 이어서 `kubectl rollout status`로 배포 완료를 기다립니다.
- **프론트엔드** (`frontend/` 변경 시): 정적 빌드를 Object Storage에 동기화합니다.

인증 정보는 모두 GitHub Actions Secrets에서 주입합니다.

## 로컬 실행

```bash
# 백엔드
cd backend
npm install
npm run start:dev

# 프론트엔드
cd frontend
npm install
npm run dev
```

백엔드에 필요한 환경 변수 (값은 저장소에 넣지 않습니다):

| 이름 | 용도 |
|---|---|
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | PostgreSQL 접속 |
| `JWT_SECRET` | 로그인 토큰 서명 |
| `ENCRYPTION_SECRET_KEY` | 클러스터 토큰 암호화 (32자 이상) |
| `PORT` | 백엔드 포트 |

프론트엔드는 `NEXT_PUBLIC_API_URL`로 백엔드 주소를 받습니다.

## 디렉터리

```
backend/    NestJS API, 지표 수집, 인증, 쿠버네티스 매니페스트
frontend/   Next.js 대시보드 (정적 export)
infra/      Terraform (NCP VPC, NKS, PostgreSQL)
.github/    백엔드, 프론트엔드 배포 워크플로
```

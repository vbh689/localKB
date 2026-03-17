# LocalKB

LocalKB la ung dung wiki / knowledge base / FAQ noi bo cho cong ty, xay dung bang `Next.js`, `Prisma`, `PostgreSQL` va `Meilisearch`.

## Tinh nang hien co

- Dang nhap noi bo bang `email/password` va session `HttpOnly cookie`
- Homepage co `instant search`
- Trang public cho `wiki`, `FAQ` va `search`
- Admin CMS cho `articles`, `FAQs`, `categories`, `tags`, `users`
- Publish / unpublish va dong bo noi dung `published` sang `Meilisearch`
- Search logs va dashboard usage trong admin
- Revision history, compare preview va restore revision cho article / FAQ

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `Meilisearch`
- `Docker Compose`

## Yeu cau

- `Node.js 22+`
- `npm`
- `Docker` va `Docker Compose`

## Cai dat nhanh

1. Cai dependencies

```bash
npm install
```

2. Tao file env

```bash
cp .env.example .env
```

3. Chay ha tang local

```bash
docker compose up -d
```

4. Tao Prisma Client, day schema va seed du lieu

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Chay app

```bash
npm run dev
```

App mac dinh chay tai [http://localhost:3000](http://localhost:3000).

## Tai khoan mac dinh sau khi seed

- Email: `admin@localkb.internal`
- Password: `ChangeMe123!`

Gia tri nay duoc doc tu `.env`:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Bien moi truong

Mau bien moi truong nam trong [.env.example](/Users/dzith/Developer/localKB/.env.example).

```env
DATABASE_URL="postgresql://localkb:localkb@localhost:5432/localkb?schema=public"
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_MASTER_KEY="localkb-master-key"
APP_URL="http://localhost:3000"
SESSION_COOKIE_NAME="localkb_session"
SEED_ADMIN_EMAIL="admin@localkb.internal"
SEED_ADMIN_PASSWORD="ChangeMe123!"
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Route chinh

- `/` homepage va instant search
- `/login` dang nhap
- `/search?q=` trang ket qua tim kiem
- `/kb/[slug]` trang article
- `/faq` danh sach FAQ
- `/faq/[slug]` chi tiet FAQ
- `/admin` dashboard quan tri
- `/admin/articles`
- `/admin/faqs`
- `/admin/categories`
- `/admin/tags`
- `/admin/users`
- `/admin/search-logs`
- `/account/password`

## API route

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/search?q=`

## Docker services

`docker-compose.yml` khoi tao:

- `postgres` tai `localhost:5432`
- `meilisearch` tai `localhost:7700`

## Kiem tra nhanh

```bash
npm run lint
npm run build
```

Neu can reset du lieu mau:

```bash
npm run db:seed
```

## Ghi chu

- Chi noi dung `PUBLISHED` moi xuat hien tren public app va search.
- `Article revision` hien tai restore `title` va `body`; `summary/category/tags/status` duoc giu nguyen.
- `FAQ revision` restore `question` va `answer`.
- Ke hoach trien khai ban dau duoc luu tai [IMPLEMENTATION_PLAN.md](/Users/dzith/Developer/localKB/IMPLEMENTATION_PLAN.md).

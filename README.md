# APL

Monorepo con:

- `backend/`: API (Node.js + Express + TypeScript + Prisma)
- `figma/`: Frontend (Vite + React)

## Requisitos

- Node.js LTS
- (Backend) PostgreSQL accesible y variables de entorno configuradas

## Backend

```bash
cd backend
npm install
cp .env.example .env
# editar .env
npm run db:generate
npm run db:migrate
npm run dev
```

## Frontend

```bash
cd figma
npm install
cp .env.example .env
npm run dev
```

## Limpieza rápida (artefactos locales)

Si necesitas “dejar limpio” el workspace (sin dependencias ni builds generados):

- borrar `**/node_modules/`
- borrar `**/dist/` y `**/build/`
- borrar `backend/logs/` si existe

Nota: los `.env` no deben commitearse; usa `.env.example` como plantilla.
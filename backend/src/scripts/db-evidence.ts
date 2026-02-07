import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

type Evidence = {
  generatedAt: string;
  databaseUrlSet: boolean;
  databaseUrlSource?: 'DATABASE_URL' | 'env-var' | 'cli-arg' | 'missing';
  tag?: string;
  serverVersion?: string;
  currentDatabase?: string;
  currentUser?: string;
  tables?: string[];
  indexes?: Array<{ table: string; index: string }>;
  triggers?: Array<{ table: string; trigger: string; timing?: string; event?: string }>;
  checkConstraints?: Array<{ table: string; name: string; definition: string }>;
  administradorColumns?: string[];
  roles?: string[];
  notes: string[];
};

const ensureLogsDir = (logsDir: string) => {
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
};

const ts = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`;
};

type Args = {
  tag?: string;
  envVar?: string;
  databaseUrl?: string;
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = {};

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tag') {
      args.tag = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--env-var' || a === '--envVar') {
      args.envVar = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--database-url' || a === '--databaseUrl') {
      args.databaseUrl = argv[i + 1];
      i++;
      continue;
    }
  }

  return args;
};

const sanitizeTag = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const safe = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
  return safe || undefined;
};

const buildOutPath = (tag?: string) => {
  const suffix = tag ? `-${tag}` : '';
  return path.join(__dirname, '../../logs', `db-evidence${suffix}-${ts()}.json`);
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tag = sanitizeTag(args.tag);

  const envVar = args.envVar?.trim();
  const envVarValue = envVar ? process.env[envVar] : undefined;
  // Regla:
  // - Si viene --database-url, usarla.
  // - Si viene --env-var, usar SOLO esa variable (si no existe, no hay fallback).
  // - Si no viene ninguna, usar DATABASE_URL.
  const effectiveDatabaseUrl = args.databaseUrl
    ? args.databaseUrl
    : envVar
      ? envVarValue
      : process.env.DATABASE_URL;

  const evidence: Evidence = {
    generatedAt: new Date().toISOString(),
    databaseUrlSet: !!effectiveDatabaseUrl,
    databaseUrlSource: args.databaseUrl
      ? 'cli-arg'
      : envVarValue
        ? 'env-var'
        : !envVar && process.env.DATABASE_URL
          ? 'DATABASE_URL'
          : 'missing',
    tag,
    notes: [],
  };

  if (!effectiveDatabaseUrl) {
    evidence.notes.push(
      envVar
        ? `Falta ${envVar}. No se puede conectar a PostgreSQL.`
        : 'Falta DATABASE_URL. No se puede conectar a PostgreSQL.'
    );
    const outPath = buildOutPath(tag);
    ensureLogsDir(path.dirname(outPath));
    fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2), 'utf-8');
    console.log(`OK (sin conexión): ${outPath}`);
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: effectiveDatabaseUrl,
      },
    },
  });

  try {
    const versionRows = await prisma.$queryRawUnsafe<Array<{ version: string }>>('SELECT version() AS version');
    evidence.serverVersion = versionRows[0]?.version;

    const whoRows = await prisma.$queryRawUnsafe<Array<{ current_database: string; current_user: string }>>(
      'SELECT current_database() AS current_database, current_user AS current_user'
    );
    evidence.currentDatabase = whoRows[0]?.current_database;
    evidence.currentUser = whoRows[0]?.current_user;

    const tableRows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    evidence.tables = tableRows.map((r) => r.tablename);

    const indexRows = await prisma.$queryRawUnsafe<Array<{ tablename: string; indexname: string }>>(
      "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname"
    );
    evidence.indexes = indexRows.map((r) => ({ table: r.tablename, index: r.indexname }));

    // Triggers: information_schema suele ser suficiente
    const triggerRows = await prisma.$queryRawUnsafe<
      Array<{ event_object_table: string; trigger_name: string; action_timing: string; event_manipulation: string }>
    >(
      "SELECT event_object_table, trigger_name, action_timing, event_manipulation FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name"
    );
    evidence.triggers = triggerRows.map((r) => ({
      table: r.event_object_table,
      trigger: r.trigger_name,
      timing: r.action_timing,
      event: r.event_manipulation,
    }));

    const checkRows = await prisma.$queryRawUnsafe<
      Array<{ conrelid: string; conname: string; definition: string }>
    >(
      "SELECT conrelid::regclass::text AS conrelid, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='c' ORDER BY conrelid::regclass::text, conname"
    );
    evidence.checkConstraints = checkRows.map((r) => ({
      table: r.conrelid,
      name: r.conname,
      definition: r.definition,
    }));

    const colRows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='administrador' ORDER BY ordinal_position"
    );
    evidence.administradorColumns = colRows.map((r) => r.column_name);

    try {
      const roleRows = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
        'SELECT rolname FROM pg_roles ORDER BY rolname'
      );
      evidence.roles = roleRows.map((r) => r.rolname);
    } catch {
      evidence.notes.push('No se pudo listar pg_roles (permisos insuficientes).');
    }

    evidence.notes.push('Reporte generado vía Prisma. Para evidencia adicional, ejecutar scripts SQL de validation/triggers en el ambiente.');
  } catch (err: any) {
    evidence.notes.push(`Error conectando o consultando BD: ${err?.message || String(err)}`);
  } finally {
    await prisma.$disconnect();
  }

  const outPath = buildOutPath(tag);
  ensureLogsDir(path.dirname(outPath));
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2), 'utf-8');
  console.log(`OK: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

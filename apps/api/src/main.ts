import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Local dev convenience only — loads apps/api/.env.local (gitignored) into
// process.env before anything else reads it, using Node's built-in loader
// (no dotenv dependency needed; requires Node >=20.6, already satisfied by
// this repo's engines.node >=20 / the Dockerfile's node:20 base). Deployed
// environments (the Container App) have no .env.local file at all and get
// their real values from actual Container App environment variables set in
// the Azure Portal / Bicep instead — loadEnvFile() just throws when the file
// doesn't exist, which we swallow here, so this is a no-op in production.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local present (production/Docker, or local dev via real shell
  // env vars instead) — nothing to do.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // tightened per-app in production via allowed origins config
  // Added 2026-09-24 alongside the schema rework: this was missing entirely,
  // so DTO decorators (@IsIn, @IsString, etc.) were never actually enforced.
  // `transform: true` is also required for nested DTOs (e.g. CreateProjectDto's
  // `firstLine`) to be instantiated as real class instances rather than plain
  // objects, which is what makes @ValidateNested + @Type work at all.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Universe API listening on http://localhost:${port}`);
}

bootstrap();

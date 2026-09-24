import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

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

// Builds the real Nest module graph from the compiled output, without a database or listening port.
// A constructor type that erases the class at runtime (for example Pick<Service, ...>) is invisible to the
// type checker and to the unit tests, which build services by hand, but stops the live app from starting.
process.env.AZURE_STORAGE_ACCOUNT_NAME ||= "checkaccount";
process.env.AZURE_STORAGE_BLOB_ENDPOINT ||= "https://checkaccount.blob.core.windows.net";
process.env.DATABASE_URL ||= "sqlserver://localhost:1433;database=x;user=sa;password=x;trustServerCertificate=true";
require("reflect-metadata");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");

NestFactory.createApplicationContext(AppModule, { logger: ["error"] })
  .then(async (ctx) => { await ctx.close(); console.log("Module wiring OK"); process.exit(0); })
  .catch((e) => { console.error("Module wiring FAILED:", e.message); process.exit(1); });

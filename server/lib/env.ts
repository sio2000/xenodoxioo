import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[env] no .env found at ${envPath}`);
    }
    return;
  }

  const buf = fs.readFileSync(envPath);

  // Handle UTF-16LE .env files (common on Windows/Notepad) which dotenv can't parse.
  const looksUtf16 =
    (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) || buf.includes(0);

  const text = looksUtf16 ? buf.toString("utf16le") : buf.toString("utf8");
  const parsed = dotenv.parse(text);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[env] loaded .env (${Object.keys(parsed).length} keys) cwd=${process.cwd()} has SUPABASE_SERVICE_ROLE_KEY=${Object.prototype.hasOwnProperty.call(
        parsed,
        "SUPABASE_SERVICE_ROLE_KEY"
      )}`
    );
    console.log(`[env] keys: ${Object.keys(parsed).join(", ")}`);
  }

  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile();


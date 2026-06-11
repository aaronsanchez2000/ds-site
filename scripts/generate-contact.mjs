import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, "contact.env");
const outputPath = path.join(rootDir, "data", "contact.js");

const parseEnvFile = (source) => {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
};

const readLocalEnv = async () => {
  try {
    return parseEnvFile(await fs.readFile(envPath, "utf8"));
  } catch {
    return {};
  }
};

const localEnv = await readLocalEnv();
const getValue = (key) => process.env[key] || localEnv[key] || "";

const contact = {
  email: getValue("CONTACT_EMAIL").trim(),
  phoneDisplay: getValue("CONTACT_PHONE_DISPLAY").trim(),
  phoneE164: getValue("CONTACT_PHONE_E164").trim(),
  smsE164: getValue("CONTACT_SMS_E164").trim() || getValue("CONTACT_PHONE_E164").trim(),
};

if (!contact.email || !contact.phoneDisplay || !contact.phoneE164) {
  throw new Error(
    "Missing contact data. Set CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, and CONTACT_PHONE_E164 in contact.env or environment variables.",
  );
}

const contents = `window.DS_CONTACT = ${JSON.stringify(contact, null, 2)};\n`;
await fs.writeFile(outputPath, contents, "utf8");
console.log(`Wrote ${path.relative(rootDir, outputPath)}`);

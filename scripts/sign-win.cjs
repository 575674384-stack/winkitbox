const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const certDir = path.join(root, "certs");
const certPath = path.join(certDir, "winkitbox-code-signing.crt");
const keyPath = path.join(certDir, "winkitbox-code-signing.key");
const pfxPath = path.join(certDir, "winkitbox-code-signing.pfx");
const password = "winkitbox-local";

fs.mkdirSync(certDir, { recursive: true });

if (!fs.existsSync(pfxPath)) {
  run("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-sha256",
    "-days",
    "1825",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-subj",
    "/CN=WinKitBox/O=WinKitBox/OU=Local Code Signing",
    "-addext",
    "keyUsage=digitalSignature",
    "-addext",
    "extendedKeyUsage=codeSigning"
  ]);

  run("openssl", [
    "pkcs12",
    "-export",
    "-out",
    pfxPath,
    "-inkey",
    keyPath,
    "-in",
    certPath,
    "-name",
    "WinKitBox",
    "-passout",
    `pass:${password}`
  ]);

  fs.rmSync(keyPath, { force: true });
}

console.log(pfxPath);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

module.exports = {
  pfxPath,
  password
};

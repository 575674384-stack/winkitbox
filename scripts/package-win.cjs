const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { password: signingPassword, pfxPath } = require("./sign-win.cjs");

const root = path.resolve(__dirname, "..");
const tempOut = path.join(os.tmpdir(), "winkitbox-release");
const finalOut = path.join(root, "release");

run("npm", ["run", "build"]);

fs.rmSync(tempOut, { recursive: true, force: true });
fs.mkdirSync(tempOut, { recursive: true });

process.env.CSC_LINK = pfxPath;
process.env.CSC_KEY_PASSWORD = signingPassword;
process.env.WIN_CSC_LINK = pfxPath;
process.env.WIN_CSC_KEY_PASSWORD = signingPassword;

run("npx", [
  "electron-builder",
  "--win",
  "--x64",
  `--config.directories.output=${tempOut}`
]);

fs.mkdirSync(finalOut, { recursive: true });
for (const name of fs.readdirSync(finalOut)) {
  if (/^WinKitBox-.*\.(exe|blockmap)$/i.test(name)) {
    const target = path.join(finalOut, name);

    try {
      fs.rmSync(target, { force: true });
    } catch (error) {
      console.warn(`Skipped locked release artifact: ${target}`);
    }
  }
}

const artifacts = fs
  .readdirSync(tempOut)
  .filter((name) => /\.exe$/i.test(name))
  .map((name) => path.join(tempOut, name));

if (artifacts.filter((file) => file.toLowerCase().endsWith(".exe")).length === 0) {
  throw new Error(`No Windows executables were produced in ${tempOut}`);
}

for (const source of artifacts) {
  const target = path.join(finalOut, path.basename(source));
  fs.rmSync(target, { force: true });
  fs.copyFileSync(source, target);
  console.log(target);
}

function run(command, args) {
  const commandLine = [command, ...args.map(quoteArg)].join(" ");
  const result = spawnSync(commandLine, {
    cwd: root,
    stdio: "inherit",
    shell: true
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteArg(value) {
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

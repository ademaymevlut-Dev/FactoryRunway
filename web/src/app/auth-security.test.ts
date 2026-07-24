import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function actionBlock(
  source: string,
  actionName: string,
  nextActionName?: string,
) {
  const start = source.indexOf(`export async function ${actionName}`);
  assert.notEqual(start, -1, `${actionName} bulunamadı`);

  const end = nextActionName
    ? source.indexOf(`export async function ${nextActionName}`, start)
    : source.length;

  return source.slice(start, end === -1 ? source.length : end);
}

function serverActionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return serverActionFiles(path);
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      return [];
    }

    const source = readFileSync(path, "utf8");
    return source.startsWith('"use server";') ? [path] : [];
  });
}

test("public hesap arayüzü yalnızca login ve PLAYER kaydı sunar", () => {
  const accountTabs = read("./account-create-tabs.tsx");
  const landing = read("./page.tsx");

  assert.doesNotMatch(
    accountTabs,
    /createAdminAction|Create Admin|Super Admin|SUPER_ADMIN|name="role"/,
  );
  assert.doesNotMatch(accountTabs, /Fabrika adı|name="factoryName"/);
  assert.match(accountTabs, /createPlayerAction/);
  assert.match(accountTabs, /loginAction/);
  assert.match(landing, /id="account"/);
});

test("public PLAYER action rolü server tarafında sabitler ve onboarding'e yönlendirir", () => {
  const actions = read("./user-actions.ts");
  const playerAction = actionBlock(
    actions,
    "createPlayerAction",
    "createAdminAction",
  );

  assert.match(playerAction, /role: USER_ROLES\.PLAYER/);
  assert.match(playerAction, /playerProfile:\s*\{\s*create:\s*\{\s*displayName:/);
  assert.match(playerAction, /redirect\("\/onboarding"\)/);
  assert.doesNotMatch(playerAction, /readString\(formData, "(?:role|factoryName)"\)/);
  assert.doesNotMatch(playerAction, /factoryName/);
  assert.doesNotMatch(playerAction, /adminProfile/);
});

test("admin oluşturma action'ı guard ile başlar ve yöneticinin session'ını değiştirmez", () => {
  const actions = read("./user-actions.ts");
  const adminAction = actionBlock(
    actions,
    "createAdminAction",
    "loginAction",
  );

  assert.match(
    adminAction,
    /\): Promise<CreateUserState> \{\s*await requireAdminUser\(\);/,
  );
  assert.match(adminAction, /ADMIN_ROLES\.has\(role\)/);
  assert.doesNotMatch(adminAction, /createSession|clearSession|redirect\(/);
});

test("login role bazlı yönlendirmeyi korur", () => {
  const actions = read("./user-actions.ts");
  const loginAction = actionBlock(actions, "loginAction", "logoutAction");

  assert.match(loginAction, /ADMIN_ROLES\.has\(user\.role\)/);
  assert.match(loginAction, /redirect\("\/admin"\)/);
  assert.match(loginAction, /redirect\("\/player"\)/);
});

test("admin route'u ve admin Server Action'ları bağımsız guard kullanır", () => {
  const adminAuth = read("./admin/admin-auth.ts");
  const adminLayout = read("./admin/layout.tsx");
  const adminDirectory = new URL("./admin", import.meta.url).pathname;
  const actionFiles = serverActionFiles(adminDirectory);
  let actionCount = 0;

  assert.match(
    adminAuth,
    /USER_ROLES\.ADMIN, USER_ROLES\.SUPER_ADMIN/,
  );
  assert.match(adminAuth, /redirect\("\/player"\)/);
  assert.match(adminLayout, /await requireAdminUser\(\)/);
  assert.ok(actionFiles.length > 0, "Admin Server Action dosyaları bulunamadı");

  for (const path of actionFiles) {
    const source = readFileSync(path, "utf8");
    const actionMatches = [
      ...source.matchAll(/export async function ([A-Za-z0-9_]+)/g),
    ];

    for (const [index, match] of actionMatches.entries()) {
      actionCount += 1;
      const nextMatch = actionMatches[index + 1];
      const block = source.slice(
        match.index,
        nextMatch?.index ?? source.length,
      );

      assert.match(
        block,
        /await requireAdminUser\(\);/,
        `${path} içindeki ${match[1]} authorization guard içermiyor`,
      );
    }
  }

  assert.ok(actionCount > 0, "Admin Server Action export'u bulunamadı");
});

test("eski create-player route'u ortak landing kayıt alanına yönlendirir", () => {
  const legacyPage = read("./create-player/page.tsx");
  const legacyFormPath = new URL(
    "./create-player/create-player-form.tsx",
    import.meta.url,
  );

  assert.match(legacyPage, /redirect\("\/#account"\)/);
  assert.equal(existsSync(legacyFormPath), false);
});

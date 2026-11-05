// Checks the seed data in schema.sql against the demo logins shown on the login page.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
const loginPage = fs.readFileSync(path.join(__dirname, "..", "jobmatch", "src", "pages", "LoginPage.jsx"), "utf8");

const seedHash = (email) => {
  const m = schema.match(new RegExp(`'${email.replace(/\./g, "\\.")}',\\s*'([^']+)'`));
  assert.ok(m, `no seed row for ${email}`);
  return m[1];
};

for (const [email, password] of [
  ["alice@email.com", "pass123"],
  ["bob@email.com", "pass123"],
  ["hr@techcorp.com", "hr123"],
  ["recruit@datasystems.com", "hr123"],
]) {
  test(`seed password for ${email} is "${password}"`, () => {
    assert.ok(bcrypt.compareSync(password, seedHash(email)));
  });
}

test("login page advertises the same demo credentials", () => {
  assert.match(loginPage, /alice@email\.com \/ pass123/);
  assert.match(loginPage, /hr@techcorp\.com \/ hr123/);
});

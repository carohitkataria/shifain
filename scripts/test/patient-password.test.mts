/** Password hashing: a right password matches, a wrong one does not, and the same password never hashes the same twice. */
import assert from "node:assert/strict";
import { hashPassword, passwordMatches } from "../../src/lib/password-hash.ts";

const hash = await hashPassword("correct horse battery");
assert.match(hash, /^scrypt\$16384\$[\w-]+\$[\w-]+$/);
assert.equal(await passwordMatches("correct horse battery", hash), true);
assert.equal(await passwordMatches("correct horse batterY", hash), false);
assert.equal(await passwordMatches("", hash), false);
assert.notEqual(await hashPassword("correct horse battery"), hash, "salted");
assert.equal(await passwordMatches("x", "plain-text"), false, "unknown formats never match");
console.log("patient-password: hashing and matching pass");

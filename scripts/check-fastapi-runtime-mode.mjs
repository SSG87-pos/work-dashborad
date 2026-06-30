import assert from "node:assert/strict";

import { people } from "../src/data.js";
import {
  buildPeopleDirectory,
  shouldExposeLocalAccountSwitcher,
  shouldUsePrototypeFallbackData
} from "../src/runtimeMode.js";

const unassignedPerson = { id: "unassigned", name: "미지정", permissionRole: "member" };
const apiProfiles = {
  "11111111-1111-4111-8111-111111111111": {
    name: "회사 관리자",
    role: "관리자",
    permissionRole: "admin",
    isTeamMember: true,
    isActive: true
  }
};

assert.equal(shouldUsePrototypeFallbackData({ isRemoteReady: false }), true);
assert.equal(shouldUsePrototypeFallbackData({ isRemoteReady: true }), false);

assert.equal(shouldExposeLocalAccountSwitcher({ isRemoteReady: false }), true);
assert.equal(shouldExposeLocalAccountSwitcher({ isRemoteReady: true }), false);

const localDirectory = buildPeopleDirectory({
  basePeople: people,
  profileOverrides: {},
  includePrototypePeople: true,
  unassignedPerson
});
assert.ok(localDirectory.some((person) => person.id === "kmryu"));
assert.ok(localDirectory.some((person) => person.id === unassignedPerson.id));

const fastApiDirectory = buildPeopleDirectory({
  basePeople: people,
  profileOverrides: apiProfiles,
  includePrototypePeople: false,
  unassignedPerson
});
assert.deepEqual(
  fastApiDirectory.map((person) => person.id),
  ["11111111-1111-4111-8111-111111111111"]
);
assert.equal(fastApiDirectory.some((person) => person.id === "kmryu"), false);
assert.equal(fastApiDirectory.some((person) => person.id === unassignedPerson.id), false);

console.log("fastapi runtime mode checks passed");

import test from "node:test";
import assert from "node:assert/strict";

import { createRemoteStore } from "../src/remoteStore.js";

test("remote store stays disabled when Supabase config is empty", async () => {
  const store = createRemoteStore({ config: {} });

  assert.equal(store.isConfigured, false);
  assert.deepEqual(await store.loadAll(), {});
  assert.equal(await store.saveBucket("lessonEdits", { updates: {} }), false);
});

test("remote store loads bucket payloads from Supabase rows", async () => {
  const calls = [];
  const client = {
    from(tableName) {
      calls.push(["from", tableName]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return Promise.resolve({
                data: [
                  { bucket: "lessonEdits", payload: { updates: { a: { course: "AI 财商" } } } },
                  { bucket: "customCatalog", payload: { teachers: [{ id: "mia", name: "Mia" }] } },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  };
  const store = createRemoteStore({
    config: { url: "https://example.supabase.co", anonKey: "anon", appId: "test-app" },
    clientFactory: async () => client,
  });

  const loaded = await store.loadAll();

  assert.deepEqual(loaded.lessonEdits, { updates: { a: { course: "AI 财商" } } });
  assert.deepEqual(loaded.customCatalog, { teachers: [{ id: "mia", name: "Mia" }] });
  assert.deepEqual(calls, [
    ["from", "class_system_state"],
    ["select", "bucket,payload,updated_at,updated_by"],
    ["eq", "app_id", "test-app"],
  ]);
});

test("remote store upserts one state bucket", async () => {
  const upserts = [];
  const client = {
    from(tableName) {
      return {
        upsert(row, options) {
          upserts.push({ tableName, row, options });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const store = createRemoteStore({
    config: {
      url: "https://example.supabase.co",
      anonKey: "anon",
      appId: "test-app",
      updatedBy: "Sophie",
    },
    clientFactory: async () => client,
  });

  const saved = await store.saveBucket("shiftOverrides", { "claire__2026-06-29": { type: "rest" } });

  assert.equal(saved, true);
  assert.equal(upserts.length, 1);
  assert.deepEqual(upserts[0], {
    tableName: "class_system_state",
    row: {
      app_id: "test-app",
      bucket: "shiftOverrides",
      payload: { "claire__2026-06-29": { type: "rest" } },
      updated_by: "Sophie",
    },
    options: { onConflict: "app_id,bucket" },
  });
});

test("remote store forwards realtime bucket changes and returns an unsubscribe function", async () => {
  let realtimeHandler = null;
  let unsubscribed = false;
  const client = {
    channel(name) {
      assert.equal(name, "class-system-state:test-app");
      return {
        on(eventName, filter, handler) {
          assert.equal(eventName, "postgres_changes");
          assert.deepEqual(filter, {
            event: "*",
            schema: "public",
            table: "class_system_state",
            filter: "app_id=eq.test-app",
          });
          realtimeHandler = handler;
          return this;
        },
        subscribe() {
          return this;
        },
        unsubscribe() {
          unsubscribed = true;
        },
      };
    },
  };
  const store = createRemoteStore({
    config: { url: "https://example.supabase.co", anonKey: "anon", appId: "test-app" },
    clientFactory: async () => client,
  });
  const changes = [];

  const unsubscribe = await store.subscribe((bucket, payload, row) => {
    changes.push({ bucket, payload, row });
  });
  realtimeHandler({
    new: { bucket: "coursePermissions", payload: { claire: ["英语陪伴"] }, updated_by: "Phebe" },
  });
  unsubscribe();

  assert.deepEqual(changes, [
    {
      bucket: "coursePermissions",
      payload: { claire: ["英语陪伴"] },
      row: { bucket: "coursePermissions", payload: { claire: ["英语陪伴"] }, updated_by: "Phebe" },
    },
  ]);
  assert.equal(unsubscribed, true);
});

test("remote store exposes Supabase auth helpers for static hosting", async () => {
  const authCalls = [];
  const client = {
    auth: {
      getSession() {
        authCalls.push(["getSession"]);
        return Promise.resolve({ data: { session: { user: { email: "sophie@example.com" } } }, error: null });
      },
      signInWithOtp(options) {
        authCalls.push(["signInWithOtp", options]);
        return Promise.resolve({ error: null });
      },
      signOut() {
        authCalls.push(["signOut"]);
        return Promise.resolve({ error: null });
      },
      onAuthStateChange(callback) {
        authCalls.push(["onAuthStateChange"]);
        callback("SIGNED_IN", { user: { email: "sophie@example.com" } });
        return { data: { subscription: { unsubscribe: () => authCalls.push(["unsubscribeAuth"]) } } };
      },
    },
  };
  const store = createRemoteStore({
    config: {
      url: "https://example.supabase.co",
      anonKey: "anon",
      appId: "test-app",
      redirectTo: "https://example.com/ClassSystem/",
    },
    clientFactory: async () => client,
  });
  const authEvents = [];

  assert.deepEqual(await store.getSession(), { user: { email: "sophie@example.com" } });
  assert.equal(await store.signInWithOtp("sophie@example.com"), true);
  const unsubscribeAuth = await store.onAuthStateChange((event, session) => authEvents.push({ event, session }));
  assert.equal(await store.signOut(), true);
  unsubscribeAuth();

  assert.deepEqual(authEvents, [
    { event: "SIGNED_IN", session: { user: { email: "sophie@example.com" } } },
  ]);
  assert.deepEqual(authCalls, [
    ["getSession"],
    [
      "signInWithOtp",
      {
        email: "sophie@example.com",
        options: { emailRedirectTo: "https://example.com/ClassSystem/" },
      },
    ],
    ["onAuthStateChange"],
    ["signOut"],
    ["unsubscribeAuth"],
  ]);
});

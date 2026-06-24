const DEFAULT_TABLE_NAME = "class_system_state";
const DEFAULT_APP_ID = "jiedeng-class-system";
const DEFAULT_SUPABASE_MODULE_URL = "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_CONFIG_IMPORT_VERSION = "20260624-public-guest-sync";

export function createRemoteStore({ config = {}, clientFactory } = {}) {
  const normalizedConfig = normalizeConfig(config);
  const isConfigured = Boolean(normalizedConfig.url && normalizedConfig.anonKey);
  let clientPromise = null;

  async function getClient() {
    if (!isConfigured) {
      return null;
    }

    if (!clientPromise) {
      clientPromise = clientFactory
        ? clientFactory(normalizedConfig)
        : createSupabaseBrowserClient(normalizedConfig);
    }

    return clientPromise;
  }

  return {
    isConfigured,

    async loadAll() {
      const client = await getClient();
      if (!client) {
        return {};
      }

      const { data, error } = await client
        .from(normalizedConfig.tableName)
        .select("bucket,payload,updated_at,updated_by")
        .eq("app_id", normalizedConfig.appId);

      if (error) {
        throw error;
      }

      return Object.fromEntries(
        (Array.isArray(data) ? data : [])
          .filter((row) => row?.bucket)
          .map((row) => [row.bucket, row.payload || {}]),
      );
    },

    async saveBucket(bucket, payload) {
      const client = await getClient();
      if (!client) {
        return false;
      }

      const { error } = await client
        .from(normalizedConfig.tableName)
        .upsert(
          {
            app_id: normalizedConfig.appId,
            bucket,
            payload,
            updated_by: normalizedConfig.updatedBy,
          },
          { onConflict: "app_id,bucket" },
        );

      if (error) {
        throw error;
      }

      return true;
    },

    async subscribe(onChange) {
      const client = await getClient();
      if (!client) {
        return () => {};
      }

      const channel = client
        .channel(`class-system-state:${normalizedConfig.appId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: normalizedConfig.tableName,
            filter: `app_id=eq.${normalizedConfig.appId}`,
          },
          (event) => {
            const row = event?.new || event?.old;
            if (!row?.bucket) {
              return;
            }
            onChange(row.bucket, row.payload || {}, row);
          },
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    },

    async getSession() {
      const client = await getClient();
      if (!client?.auth) {
        return null;
      }

      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }

      return data?.session || null;
    },

    async signInWithOtp(email) {
      const client = await getClient();
      if (!client?.auth) {
        return false;
      }

      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: normalizedConfig.redirectTo },
      });
      if (error) {
        throw error;
      }

      return true;
    },

    async signOut() {
      const client = await getClient();
      if (!client?.auth) {
        return false;
      }

      const { error } = await client.auth.signOut();
      if (error) {
        throw error;
      }

      return true;
    },

    async onAuthStateChange(onChange) {
      const client = await getClient();
      if (!client?.auth) {
        return () => {};
      }

      const { data } = client.auth.onAuthStateChange((event, session) => {
        onChange(event, session || null);
      });

      return () => {
        data?.subscription?.unsubscribe();
      };
    },
  };
}

export async function loadRemoteStoreConfig() {
  try {
    const module = await import(`./supabaseConfig.js?v=${SUPABASE_CONFIG_IMPORT_VERSION}`);
    return module.supabaseConfig || module.default || {};
  } catch (error) {
    if (isMissingConfigModule(error)) {
      return {};
    }
    throw error;
  }
}

function normalizeConfig(config) {
  return {
    url: String(config?.url || "").trim(),
    anonKey: String(config?.anonKey || "").trim(),
    appId: String(config?.appId || DEFAULT_APP_ID).trim() || DEFAULT_APP_ID,
    tableName: String(config?.tableName || DEFAULT_TABLE_NAME).trim() || DEFAULT_TABLE_NAME,
    updatedBy: String(config?.updatedBy || "browser").trim() || "browser",
    redirectTo: String(config?.redirectTo || globalThis?.location?.href || "").trim(),
    moduleUrl: String(config?.moduleUrl || DEFAULT_SUPABASE_MODULE_URL).trim() || DEFAULT_SUPABASE_MODULE_URL,
    options: config?.options || {},
  };
}

async function createSupabaseBrowserClient(config) {
  const { createClient } = await import(config.moduleUrl);
  return createClient(config.url, config.anonKey, config.options);
}

function isMissingConfigModule(error) {
  return (
    error?.code === "ERR_MODULE_NOT_FOUND" ||
    String(error?.message || "").includes("supabaseConfig.js")
  );
}

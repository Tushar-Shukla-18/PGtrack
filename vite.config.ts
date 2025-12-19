import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure required public env vars are always available in the browser build.
  // (These values are publishable and required for the app to run.)
  const env = loadEnv(mode, process.cwd(), "");

  const fallbackSupabaseUrl = "https://bpbzqvghfuspsdsjdoxc.supabase.co";
  const fallbackSupabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwYnpxdmdoZnVzcHNkc2pkb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDQ4ODcsImV4cCI6MjA4MTQyMDg4N30.ZssG9rqR6VfH27t_izwH64R6oDzbCIIWU3TOQQ3uWJs";

  const supabaseUrl = env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseKey;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Inline into the bundle so createClient() never sees undefined.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseKey),
    },
  };
});

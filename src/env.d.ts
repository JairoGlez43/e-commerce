// Types for the environment variables read through import.meta.env (see .env.example).
interface ImportMetaEnv {
	readonly WHATSAPP_NUMBER?: string;
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

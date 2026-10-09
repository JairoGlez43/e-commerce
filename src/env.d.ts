// Types for the environment variables read through import.meta.env (see .env.example).
interface ImportMetaEnv {
	readonly WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

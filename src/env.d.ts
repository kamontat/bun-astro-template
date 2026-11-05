interface ImportMetaEnv {
	/** Google Tag Manager container id, inlined by `astro build`; see `#lib/gtm`. */
	readonly PUBLIC_GTM_ID?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

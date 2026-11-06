interface ImportMetaEnv {
	/** Google Tag Manager container id, inlined by `astro build`; see `#lib/gtm`. */
	readonly PUBLIC_GTM_ID?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare namespace astroHTML.JSX {
	interface HTMLAttributes {
		/** `@kcstyles/reset.css` lays out `<div row>` as a flex row instead of a column. */
		row?: boolean | "" | undefined | null
		/** `@kcstyles/reset.css` lays out `<div block>` as a block instead of a flex column. */
		block?: boolean | "" | undefined | null
	}
}

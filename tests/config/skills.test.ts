import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")
const skillsDir = join(root, ".claude", "skills")

const skills = readdirSync(skillsDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort()

// Names the project skills had before the project- prefix; nothing may still point at them.
const retired = [
	"adding-a-page",
	"astro-components",
	"build-and-deploy",
	"landing-a-change",
	"repo-scripts",
	"shipping-a-change",
]

describe(".claude/skills", () => {
	it("has a skill for pages, layouts and components", () => {
		expect(skills).toEqual(expect.arrayContaining(["project-pages", "project-layouts", "project-components"]))
	})

	it.each(skills)("%s is prefixed with project-", (skill) => {
		expect(skill).toMatch(/^project-[a-z-]+$/)
	})

	it.each(skills)("%s has a SKILL.md whose name matches its directory", (skill) => {
		const file = join(skillsDir, skill, "SKILL.md")
		expect(existsSync(file)).toBe(true)
		expect(readFileSync(file, "utf8")).toMatch(new RegExp(`^---\\nname: ${skill}\\ndescription: .+\\n---\\n`))
	})

	it.each(skills)("%s is listed in the README skills table", (skill) => {
		expect(readFileSync(join(root, "README.md"), "utf8")).toMatch(new RegExp(`^\\| \`${skill}\` +\\|`, "m"))
	})

	it("no doc refers to a retired skill name", () => {
		const docs = [
			join(root, "README.md"),
			join(root, "GET_START.md"),
			...skills.map((skill) => join(skillsDir, skill, "SKILL.md")),
		]
		const stale = docs.flatMap((file) => {
			const text = readFileSync(file, "utf8")
			return retired.filter((name) => text.includes(`\`${name}\``)).map((name) => `${file}: ${name}`)
		})
		expect(stale).toEqual([])
	})
})

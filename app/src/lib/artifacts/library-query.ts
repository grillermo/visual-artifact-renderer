import { ARTIFACT_TYPES, type ArtifactType } from "@/lib/contract/artifact-schema"

/**
 * Library search query. The raw string is the single source of truth and lives
 * in the URL as `?q=`. Rail clicks edit operators inside it; free text stays.
 *
 * Grammar: whitespace-separated tokens. `key:value` is an operator when the key
 * is known; anything else is a search term. Values are kebab-case or a known type.
 */
export const LIBRARY_STATES = ["open", "published", "new", "fixture"] as const
export type LibraryState = (typeof LIBRARY_STATES)[number]

export interface LibraryQuery {
  /** Lowercased free-text terms. Every term must match. */
  terms: string[]
  types: ArtifactType[]
  projects: string[]
  topics: string[]
  states: LibraryState[]
  /** `updated:7d` keeps rows changed in the last N days. */
  updatedWithinDays?: number
}

export type QueryOperator =
  | { key: "type"; value: ArtifactType }
  | { key: "project"; value: string }
  | { key: "topic"; value: string }
  | { key: "is"; value: LibraryState }
  | { key: "updated"; value: string }

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DAYS = /^(\d{1,3})d$/

function tokens(raw: string): string[] {
  return raw.trim().split(/\s+/).filter(Boolean)
}

/** Parse one token as an operator, or null when it is a search term. */
export function parseOperator(token: string): QueryOperator | null {
  const colon = token.indexOf(":")
  if (colon <= 0) return null
  const key = token.slice(0, colon).toLowerCase()
  const value = token.slice(colon + 1).toLowerCase()
  if (!value) return null
  switch (key) {
    case "type":
      return (ARTIFACT_TYPES as readonly string[]).includes(value) ? { key, value: value as ArtifactType } : null
    case "project":
    case "topic":
      return KEBAB.test(value) ? { key, value } : null
    case "is":
      return (LIBRARY_STATES as readonly string[]).includes(value) ? { key, value: value as LibraryState } : null
    case "updated":
      return DAYS.test(value) ? { key, value } : null
    default:
      return null
  }
}

export function parseLibraryQuery(raw: string): LibraryQuery {
  const query: LibraryQuery = { terms: [], types: [], projects: [], topics: [], states: [] }
  const add = <T,>(list: T[], value: T) => { if (!list.includes(value)) list.push(value) }
  for (const token of tokens(raw)) {
    const op = parseOperator(token)
    if (!op) { query.terms.push(token.toLowerCase()); continue }
    if (op.key === "type") add(query.types, op.value)
    else if (op.key === "project") add(query.projects, op.value)
    else if (op.key === "topic") add(query.topics, op.value)
    else if (op.key === "is") add(query.states, op.value)
    else query.updatedWithinDays = Number(DAYS.exec(op.value)![1])
  }
  return query
}

export function operatorToken(op: QueryOperator): string {
  return `${op.key}:${op.value}`
}

/** Operators in the order the reader typed them. */
export function queryOperators(raw: string): QueryOperator[] {
  return tokens(raw).map(parseOperator).filter((op): op is QueryOperator => op !== null)
}

export function hasOperator(raw: string, op: QueryOperator): boolean {
  const wanted = operatorToken(op)
  return queryOperators(raw).some((existing) => operatorToken(existing) === wanted)
}

/** Remove one operator, keeping every other token in place. */
export function withoutOperator(raw: string, op: QueryOperator): string {
  const wanted = operatorToken(op)
  return tokens(raw).filter((token) => {
    const parsed = parseOperator(token)
    return !parsed || operatorToken(parsed) !== wanted
  }).join(" ")
}

/** Remove every operator with this key, keeping terms and other operators. */
export function withoutKey(raw: string, key: QueryOperator["key"]): string {
  return tokens(raw).filter((token) => parseOperator(token)?.key !== key).join(" ")
}

/**
 * Toggle an operator. With `exclusive`, selecting replaces every other operator
 * of the same key, which is how single-choice rail facets behave.
 */
export function toggleOperator(raw: string, op: QueryOperator, { exclusive = false } = {}): string {
  if (hasOperator(raw, op)) return withoutOperator(raw, op)
  const base = exclusive ? withoutKey(raw, op.key) : raw
  const operators = tokens(base).filter((token) => parseOperator(token))
  const terms = tokens(base).filter((token) => !parseOperator(token))
  return [...operators, operatorToken(op), ...terms].join(" ")
}

/** Free text without operators, for "results for …" copy. */
export function queryText(raw: string): string {
  return tokens(raw).filter((token) => !parseOperator(token)).join(" ")
}

export function normaliseQuery(raw: string): string {
  return tokens(raw).join(" ")
}

export const LIBRARY_GROUP_PARAM = "group"

export interface LibraryParams {
  q: string
  group?: string
}

/**
 * Read the library state from a URL search string. Older links used
 * `?project=` and `?type=`; they become operators so they keep working.
 */
export function libraryParamsFromSearch(search: string): LibraryParams {
  const params = new URLSearchParams(search)
  const parts = [params.get("q") ?? ""]
  const project = params.get("project")
  const type = params.get("type")
  if (project && parseOperator(`project:${project}`)) parts.unshift(`project:${project}`)
  if (type && parseOperator(`type:${type}`)) parts.unshift(`type:${type}`)
  const group = params.get(LIBRARY_GROUP_PARAM) ?? undefined
  return { q: normaliseQuery(parts.join(" ")), group: group && /^(project|type)$/.test(group) ? group : undefined }
}

export function librarySearch({ q, group }: LibraryParams): string {
  const params = new URLSearchParams()
  const query = normaliseQuery(q)
  if (query) params.set("q", query)
  if (group) params.set(LIBRARY_GROUP_PARAM, group)
  const search = params.toString()
  return search ? `?${search}` : ""
}

/* The personal creative operating system's data layer.
 * Every space (Ideas, Journal, Library, Archive) stores its records
 * in IndexedDB on this device — nothing ever leaves the browser. */

import { STORES, newId, storeDelete, storeGetAll, storePut } from './storage'

/* ------------------------------------------------------------------ */
/* Ideas — capture before you design                                   */
/* ------------------------------------------------------------------ */

export type IdeaKind = 'note' | 'inspiration' | 'reference' | 'prompt'

export type Idea = {
  id: string
  kind: IdeaKind
  title: string
  body: string
  color: string
  createdAt: number
  updatedAt: number
}

export const IDEA_KINDS: { id: IdeaKind; label: string }[] = [
  { id: 'note', label: 'Note' },
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'reference', label: 'Reference' },
  { id: 'prompt', label: 'Prompt' },
]

export const IDEA_COLORS = ['#F3F1EC', '#EDE7FF', '#E7F5CE', '#FFEFD2', '#FDE4E0', '#DFF0EA']

export function makeIdea(partial: Partial<Idea> = {}): Idea {
  const now = Date.now()
  return {
    id: newId(),
    kind: 'note',
    title: '',
    body: '',
    color: IDEA_COLORS[0],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export const getIdeas = async () => (await storeGetAll<Idea>(STORES.ideas)).sort((a, b) => b.updatedAt - a.updatedAt)
export const putIdea = (idea: Idea) => storePut(STORES.ideas, { ...idea, updatedAt: Date.now() })
export const deleteIdea = (id: string) => storeDelete(STORES.ideas, id)

/* ------------------------------------------------------------------ */
/* Journal — the creative process, not just the output                 */
/* ------------------------------------------------------------------ */

export type JournalEntry = {
  id: string
  title: string
  body: string
  projectId?: string
  projectName?: string
  createdAt: number
  updatedAt: number
}

export function makeJournalEntry(partial: Partial<JournalEntry> = {}): JournalEntry {
  const now = Date.now()
  return {
    id: newId(),
    title: '',
    body: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export const getJournal = async () => (await storeGetAll<JournalEntry>(STORES.journal)).sort((a, b) => b.createdAt - a.createdAt)
export const putJournalEntry = (entry: JournalEntry) => storePut(STORES.journal, { ...entry, updatedAt: Date.now() })
export const deleteJournalEntry = (id: string) => storeDelete(STORES.journal, id)

/* ------------------------------------------------------------------ */
/* Library — the personal asset universe                               */
/* ------------------------------------------------------------------ */

export type AssetKind = 'color' | 'snippet' | 'link' | 'prompt'

export type AssetItem = {
  id: string
  kind: AssetKind
  name: string
  value: string
  createdAt: number
  updatedAt: number
}

export const ASSET_KINDS: { id: AssetKind; label: string; hint: string }[] = [
  { id: 'color', label: 'Color', hint: '#D1FF5C' },
  { id: 'snippet', label: 'Snippet', hint: 'Reusable copy, CSS, or notes' },
  { id: 'link', label: 'Link', hint: 'https://…' },
  { id: 'prompt', label: 'Prompt', hint: 'A prompt you reuse with AI' },
]

export function makeAsset(partial: Partial<AssetItem> = {}): AssetItem {
  const now = Date.now()
  return {
    id: newId(),
    kind: 'color',
    name: '',
    value: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export const getAssets = async () => (await storeGetAll<AssetItem>(STORES.assets)).sort((a, b) => b.updatedAt - a.updatedAt)
export const putAsset = (asset: AssetItem) => storePut(STORES.assets, { ...asset, updatedAt: Date.now() })
export const deleteAsset = (id: string) => storeDelete(STORES.assets, id)

/* ------------------------------------------------------------------ */
/* Archive — named snapshots instead of final-final-v4                 */
/* ------------------------------------------------------------------ */

export type Snapshot = {
  id: string
  projectId: string
  projectName: string
  label: string
  nodes: unknown[]
  createdAt: number
  updatedAt: number
}

export function makeSnapshot(projectId: string, projectName: string, label: string, nodes: unknown[]): Snapshot {
  const now = Date.now()
  return { id: newId(), projectId, projectName, label, nodes, createdAt: now, updatedAt: now }
}

export const getSnapshots = async () => (await storeGetAll<Snapshot>(STORES.snapshots)).sort((a, b) => b.createdAt - a.createdAt)
export const putSnapshot = (snapshot: Snapshot) => storePut(STORES.snapshots, snapshot)
export const deleteSnapshot = (id: string) => storeDelete(STORES.snapshots, id)

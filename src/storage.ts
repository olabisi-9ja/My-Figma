export type LocalProject = {
  id: string
  name: string
  nodes: unknown[]
  createdAt: number
  updatedAt: number
}

export type WorkspaceBackup = {
  format: 'canvasly-backup'
  version: 1
  exportedAt: string
  projects: LocalProject[]
}

const DATABASE = 'canvasly-offline-workspace'
const VERSION = 2

/** Every object store in the personal workspace database. */
export const STORES = {
  projects: 'projects',
  ideas: 'ideas',
  journal: 'journal',
  assets: 'assets',
  snapshots: 'snapshots',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          const created = db.createObjectStore(store, { keyPath: 'id' })
          created.createIndex('updatedAt', 'updatedAt')
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `record-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/* ------------------------------------------------------------------ */
/* Generic record helpers shared by every workspace space              */
/* ------------------------------------------------------------------ */

export async function storeGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(store, 'readonly')
    return await requestResult(transaction.objectStore(store).getAll() as IDBRequest<T[]>)
  } finally {
    db.close()
  }
}

export async function storePut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(store, 'readwrite')
    await requestResult(transaction.objectStore(store).put(value))
  } finally {
    db.close()
  }
}

export async function storeDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(store, 'readwrite')
    await requestResult(transaction.objectStore(store).delete(id))
  } finally {
    db.close()
  }
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export function makeProject(name: string, nodes: unknown[] = []): LocalProject {
  const now = Date.now()
  return {
    id: newId(),
    name,
    nodes,
    createdAt: now,
    updatedAt: now,
  }
}

export async function getProjects(): Promise<LocalProject[]> {
  const projects = await storeGetAll<LocalProject>(STORES.projects)
  return projects.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putProject(project: LocalProject): Promise<void> {
  await storePut(STORES.projects, project)
}

export async function deleteProject(projectId: string): Promise<void> {
  await storeDelete(STORES.projects, projectId)
}

export async function makeBackup(): Promise<WorkspaceBackup> {
  return {
    format: 'canvasly-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: await getProjects(),
  }
}

function asImportedProject(value: unknown): LocalProject | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<LocalProject>
  if (!Array.isArray(candidate.nodes)) return null
  return {
    id: newId(),
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Imported project',
    nodes: candidate.nodes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Accepts either a full Canvasly backup or an exported single design JSON file. */
export function parseImport(raw: unknown): LocalProject[] {
  if (!raw || typeof raw !== 'object') throw new Error('This file is not a valid Canvasly backup.')
  const data = raw as { format?: string; projects?: unknown[]; name?: string; nodes?: unknown[] }
  if (data.format === 'canvasly-backup' && Array.isArray(data.projects)) {
    const projects = data.projects.map(asImportedProject).filter((project): project is LocalProject => Boolean(project))
    if (projects.length) return projects
  }
  const single = asImportedProject(data)
  if (single) return [single]
  throw new Error('No design projects were found in this file.')
}

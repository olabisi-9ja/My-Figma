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
const STORE = 'projects'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
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

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readonly')
    const projects = await requestResult(transaction.objectStore(STORE).getAll())
    return projects.sort((a, b) => b.updatedAt - a.updatedAt)
  } finally {
    db.close()
  }
}

export async function putProject(project: LocalProject): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    await requestResult(transaction.objectStore(STORE).put(project))
  } finally {
    db.close()
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    await requestResult(transaction.objectStore(STORE).delete(projectId))
  } finally {
    db.close()
  }
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

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Cloud,
  Code2,
  Copy,
  Download,
  Eye,
  Frame,
  Hand,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  Link2,
  LockKeyhole,
  MessageCircle,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  PenTool,
  Play,
  Plus,
  Redo2,
  Search,
  Share2,
  Square,
  Star,
  TextCursorInput,
  Trash2,
  Undo2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import './styles.css'

type NodeKind = 'rect' | 'ellipse' | 'text' | 'image'
type Tool = 'select' | 'frame' | 'rect' | 'ellipse' | 'pen' | 'text' | 'hand' | 'comment'
type InspectorTab = 'design' | 'prototype' | 'inspect'

type DesignNode = {
  id: string
  type: NodeKind
  name: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  radius?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  opacity?: number
  rotation?: number
  description?: string
}

type Comment = {
  id: string
  author: string
  initials: string
  color: string
  message: string
  time: string
  nodeId?: string
  resolved?: boolean
}

type Action =
  | { mode: 'drag'; nodeId: string; startX: number; startY: number; initialX: number; initialY: number; moved: boolean }
  | { mode: 'pan'; startX: number; startY: number; initialX: number; initialY: number; moved: boolean }
  | null

const board = { width: 1440, height: 900 }
const storageKey = 'canvasly-personal-file-v1'

const initialNodes: DesignNode[] = [
  { id: 'nav-logo', type: 'text', name: 'COVE logo', x: 68, y: 55, width: 115, height: 32, fill: 'transparent', text: 'COVE', fontSize: 25, fontWeight: 800, color: '#1C1C1A', description: 'Brand wordmark' },
  { id: 'nav-work', type: 'text', name: 'Navigation / Work', x: 694, y: 62, width: 44, height: 22, fill: 'transparent', text: 'Work', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-studio', type: 'text', name: 'Navigation / Studio', x: 764, y: 62, width: 50, height: 22, fill: 'transparent', text: 'Studio', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-journal', type: 'text', name: 'Navigation / Journal', x: 841, y: 62, width: 56, height: 22, fill: 'transparent', text: 'Journal', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-contact', type: 'rect', name: 'Navigation / Contact', x: 1190, y: 46, width: 174, height: 46, fill: '#1C1C1A', radius: 23 },
  { id: 'nav-contact-label', type: 'text', name: 'Contact label', x: 1220, y: 59, width: 112, height: 24, fill: 'transparent', text: 'Start a project', fontSize: 14, fontWeight: 650, color: '#FFFFFF' },
  { id: 'eyebrow', type: 'text', name: 'Hero / Eyebrow', x: 70, y: 198, width: 270, height: 24, fill: 'transparent', text: 'INDEPENDENT CREATIVE STUDIO', fontSize: 12, fontWeight: 750, color: '#827D73' },
  { id: 'hero-title', type: 'text', name: 'Hero / Heading', x: 65, y: 244, width: 620, height: 240, fill: 'transparent', text: 'Ideas with a\npoint of view.', fontSize: 75, fontWeight: 700, color: '#1C1C1A' },
  { id: 'hero-body', type: 'text', name: 'Hero / Body', x: 70, y: 520, width: 410, height: 72, fill: 'transparent', text: 'We turn ambitious ideas into identities,\ndigital experiences, and brands in motion.', fontSize: 18, fontWeight: 430, color: '#625F58' },
  { id: 'hero-button', type: 'rect', name: 'Button / Primary', x: 70, y: 642, width: 177, height: 56, fill: '#D1FF5C', radius: 28 },
  { id: 'hero-button-label', type: 'text', name: 'Button / Primary label', x: 97, y: 660, width: 124, height: 25, fill: 'transparent', text: 'View our work  ↗', fontSize: 15, fontWeight: 700, color: '#1C1C1A' },
  { id: 'hero-card', type: 'image', name: 'Hero visual / Abstract', x: 760, y: 165, width: 605, height: 576, fill: '#C4B2FF', radius: 26, description: 'Gradient studio artwork' },
  { id: 'hero-card-shape', type: 'ellipse', name: 'Hero visual / Orb', x: 1020, y: 221, width: 258, height: 258, fill: '#D9FF72', opacity: 0.95 },
  { id: 'hero-card-tag', type: 'rect', name: 'Hero visual / Project tag', x: 791, y: 676, width: 170, height: 39, fill: '#FFFFFF', radius: 19 },
  { id: 'hero-card-tag-text', type: 'text', name: 'Hero visual / Project tag text', x: 809, y: 687, width: 135, height: 20, fill: 'transparent', text: 'Orbit — 2024', fontSize: 13, fontWeight: 700, color: '#24211F' },
  { id: 'section-line', type: 'rect', name: 'Section divider', x: 70, y: 814, width: 1294, height: 1, fill: '#DDD9D1' },
  { id: 'section-kicker', type: 'text', name: 'Selected work label', x: 70, y: 846, width: 150, height: 22, fill: 'transparent', text: 'SELECTED WORK', fontSize: 12, fontWeight: 750, color: '#827D73' },
  { id: 'section-count', type: 'text', name: 'Project count', x: 1306, y: 846, width: 65, height: 22, fill: 'transparent', text: '(04)', fontSize: 12, fontWeight: 750, color: '#827D73' },
]

const toolItems: { id: Tool; label: string; shortcut: string; icon: ReactNode }[] = [
  { id: 'select', label: 'Move', shortcut: 'V', icon: <MousePointer2 size={17} /> },
  { id: 'frame', label: 'Frame', shortcut: 'F', icon: <Frame size={17} /> },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: <Square size={17} /> },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <Circle size={17} /> },
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: <PenTool size={17} /> },
  { id: 'text', label: 'Text', shortcut: 'T', icon: <TextCursorInput size={17} /> },
  { id: 'hand', label: 'Hand tool', shortcut: 'H', icon: <Hand size={17} /> },
]

const defaultComments: Comment[] = [
  { id: 'comment-1', author: 'Maya Chen', initials: 'MC', color: '#d8a5ef', message: 'Could we make this headline a touch more confident?', time: '12m', nodeId: 'hero-title' },
  { id: 'comment-2', author: 'You', initials: 'YO', color: '#c7f162', message: 'The hero visual is ready for the next review.', time: '1h', nodeId: 'hero-card', resolved: false },
]

function cloneNodes(nodes: DesignNode[]) {
  return nodes.map((node) => ({ ...node }))
}

function loadNodes() {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as DesignNode[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // A corrupted local draft should never prevent the editor from opening.
  }
  return initialNodes
}

function IconButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button className={`icon-button ${active ? 'is-active' : ''}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

function Avatar({ initials, color, small = false }: { initials: string; color: string; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar--small' : ''}`} style={{ background: color }}>{initials}</span>
}

function App() {
  const [nodes, setNodes] = useState<DesignNode[]>(loadNodes)
  const nodesRef = useRef(nodes)
  const historyRef = useRef<DesignNode[][]>([cloneNodes(nodes)])
  const historyIndexRef = useRef(0)
  const [selectedId, setSelectedId] = useState<string>('hero-card')
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('design')
  const [leftTab, setLeftTab] = useState<'layers' | 'assets'>('layers')
  const [zoom, setZoom] = useState(0.62)
  const [pan, setPan] = useState({ x: 105, y: 54 })
  const [action, setAction] = useState<Action>(null)
  const [showExport, setShowExport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [comments, setComments] = useState<Comment[]>(defaultComments)
  const [commentText, setCommentText] = useState('')
  const [toast, setToast] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  const selected = nodes.find((node) => node.id === selectedId)

  const remember = (snapshot: DesignNode[]) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    nextHistory.push(cloneNodes(snapshot))
    historyRef.current = nextHistory.slice(-60)
    historyIndexRef.current = historyRef.current.length - 1
  }

  const replaceNodes = (next: DesignNode[], saveHistory = false) => {
    nodesRef.current = next
    setNodes(next)
    if (saveHistory) remember(next)
  }

  const updateNode = (id: string, patch: Partial<DesignNode>, record = true) => {
    const next = nodesRef.current.map((node) => node.id === id ? { ...node, ...patch } : node)
    replaceNodes(next, record)
  }

  const undo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    replaceNodes(cloneNodes(historyRef.current[historyIndexRef.current]))
    setToast('Undid last change')
  }

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    replaceNodes(cloneNodes(historyRef.current[historyIndexRef.current]))
    setToast('Redid last change')
  }

  const saveDraft = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(nodesRef.current))
    setToast('Saved locally')
  }

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(nodes))
  }, [nodes])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === 'd') {
        event.preventDefault()
        if (selected) duplicateNode()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === 's') {
        event.preventDefault()
        saveDraft()
        return
      }
      if ((key === 'backspace' || key === 'delete') && selectedId) {
        event.preventDefault()
        deleteSelected()
        return
      }
      const shortcutMap: Record<string, Tool> = { v: 'select', f: 'frame', r: 'rect', o: 'ellipse', p: 'pen', t: 'text', h: 'hand' }
      if (shortcutMap[key]) setActiveTool(shortcutMap[key])
      if (key === 'escape') {
        setSelectedId('')
        setActiveTool('select')
        setShowExport(false)
        setShowShare(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // `selected` is deliberately included so duplicate feels immediate on keyboard.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedId])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!action) return
      if (action.mode === 'pan') {
        const nextPan = { x: action.initialX + event.clientX - action.startX, y: action.initialY + event.clientY - action.startY }
        setPan(nextPan)
        if (Math.abs(event.clientX - action.startX) > 2 || Math.abs(event.clientY - action.startY) > 2) {
          setAction({ ...action, moved: true })
        }
        return
      }
      const dx = (event.clientX - action.startX) / zoom
      const dy = (event.clientY - action.startY) / zoom
      const next = nodesRef.current.map((node) => node.id === action.nodeId ? { ...node, x: Math.round(action.initialX + dx), y: Math.round(action.initialY + dy) } : node)
      replaceNodes(next)
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) setAction({ ...action, moved: true })
    }
    const onPointerUp = () => {
      if (action?.moved && action.mode === 'drag') remember(nodesRef.current)
      setAction(null)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [action, zoom])

  const canvasPoint = (event: ReactPointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: Math.round((event.clientX - rect.left - pan.x) / zoom), y: Math.round((event.clientY - rect.top - pan.y) / zoom) }
  }

  const addNode = (type: NodeKind, x: number, y: number) => {
    const id = `${type}-${Date.now()}`
    const sizes: Record<NodeKind, Pick<DesignNode, 'width' | 'height' | 'fill' | 'radius' | 'text' | 'fontSize' | 'fontWeight' | 'color'>> = {
      rect: { width: 180, height: 120, fill: '#D1FF5C', radius: 12 },
      ellipse: { width: 150, height: 150, fill: '#C4B2FF' },
      text: { width: 220, height: 42, fill: 'transparent', text: 'New text', fontSize: 28, fontWeight: 650, color: '#1C1C1A' },
      image: { width: 240, height: 160, fill: '#C4B2FF', radius: 18 },
    }
    const config = sizes[type]
    const next: DesignNode = { id, type, name: `New ${type === 'rect' ? 'rectangle' : type}`, x, y, ...config }
    replaceNodes([...nodesRef.current, next], true)
    setSelectedId(id)
    setActiveTool('select')
    setToast(`Added ${next.name}`)
  }

  const handleCanvasDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return
    if (event.button === 1 || activeTool === 'hand') {
      setAction({ mode: 'pan', startX: event.clientX, startY: event.clientY, initialX: pan.x, initialY: pan.y, moved: false })
      return
    }
    const point = canvasPoint(event)
    if (activeTool === 'rect') addNode('rect', point.x, point.y)
    else if (activeTool === 'ellipse') addNode('ellipse', point.x, point.y)
    else if (activeTool === 'text') addNode('text', point.x, point.y)
    else if (activeTool === 'frame') {
      addNode('rect', point.x, point.y)
      setToast('Frame placeholder added — use it as a container')
    } else if (activeTool === 'pen') {
      addNode('rect', point.x, point.y)
      setToast('Pen paths are on the personal roadmap')
    } else if (activeTool === 'comment') {
      setInspectorTab('prototype')
      setToast('Leave a note in the comments panel')
    } else {
      setSelectedId('')
    }
  }

  const startNodeDrag = (event: ReactPointerEvent<HTMLDivElement>, node: DesignNode) => {
    event.stopPropagation()
    if (activeTool === 'comment') {
      setSelectedId(node.id)
      setInspectorTab('prototype')
      return
    }
    if (activeTool !== 'select') return
    setSelectedId(node.id)
    setAction({ mode: 'drag', nodeId: node.id, startX: event.clientX, startY: event.clientY, initialX: node.x, initialY: node.y, moved: false })
  }

  const duplicateNode = () => {
    if (!selected) return
    const id = `${selected.type}-${Date.now()}`
    const copy: DesignNode = { ...selected, id, name: `${selected.name} copy`, x: selected.x + 24, y: selected.y + 24 }
    replaceNodes([...nodesRef.current, copy], true)
    setSelectedId(id)
    setToast('Duplicated layer')
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const current = nodesRef.current
    if (current.length <= 1) return
    const index = current.findIndex((node) => node.id === selectedId)
    replaceNodes(current.filter((node) => node.id !== selectedId), true)
    setSelectedId(current[Math.max(0, index - 1)]?.id ?? '')
    setToast('Layer deleted')
  }

  const download = (content: string, type: string, name: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type }))
    link.download = name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 800)
  }

  const exportJson = () => {
    download(JSON.stringify({ name: 'Cove Studio Landing Page', version: 1, canvas: board, nodes: nodesRef.current }, null, 2), 'application/json', 'cove-studio.design.json')
    setShowExport(false)
    setToast('Design JSON exported')
  }

  const exportSvg = () => {
    const shape = (node: DesignNode) => {
      const opacity = node.opacity ?? 1
      if (node.type === 'text') return `<text x="${node.x}" y="${node.y + (node.fontSize ?? 16)}" fill="${node.color ?? '#1C1C1A'}" font-family="Arial, sans-serif" font-size="${node.fontSize ?? 16}" font-weight="${node.fontWeight ?? 400}">${(node.text ?? '').split('\n').map((line, index) => `<tspan x="${node.x}" dy="${index === 0 ? 0 : (node.fontSize ?? 16) * 1.2}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('')}</text>`
      if (node.type === 'ellipse') return `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${node.fill}" opacity="${opacity}" />`
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.radius ?? 0}" fill="${node.fill}" opacity="${opacity}" />`
    }
    download(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${board.width} ${board.height}" width="${board.width}" height="${board.height}"><rect width="100%" height="100%" fill="#FCFAF8"/>${nodesRef.current.map(shape).join('')}</svg>`, 'image/svg+xml', 'cove-studio.svg')
    setShowExport(false)
    setToast('SVG exported')
  }

  const addComment = () => {
    const message = commentText.trim()
    if (!message) return
    setComments((current) => [{ id: `comment-${Date.now()}`, author: 'You', initials: 'YO', color: '#c7f162', message, time: 'now', nodeId: selectedId || undefined }, ...current])
    setCommentText('')
    setToast('Comment added')
  }

  const renderNode = (node: DesignNode) => {
    const isSelected = selectedId === node.id
    const style: CSSProperties = {
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      opacity: node.opacity ?? 1,
      transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
      zIndex: isSelected ? 40 : undefined,
    }
    const shared = {
      className: `canvas-node canvas-node--${node.type} ${isSelected ? 'is-selected' : ''}`,
      style,
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => startNodeDrag(event, node),
      title: node.name,
    }
    if (node.type === 'text') {
      return <div key={node.id} {...shared} style={{ ...style, color: node.color, fontSize: node.fontSize, fontWeight: node.fontWeight, lineHeight: 1.1 }}>{node.text}</div>
    }
    if (node.type === 'ellipse') {
      return <div key={node.id} {...shared} style={{ ...style, background: node.fill, border: node.stroke ? `${node.strokeWidth ?? 1}px solid ${node.stroke}` : undefined, borderRadius: '50%' }} />
    }
    if (node.type === 'image') {
      return (
        <div key={node.id} {...shared} style={{ ...style, background: node.fill, borderRadius: node.radius }}>
          <div className="image-noise" />
          <div className="image-ribbon image-ribbon--one" />
          <div className="image-ribbon image-ribbon--two" />
          <div className="image-sphere" />
          <span className="image-caption">COVE<br />ARCHIVE<br />NO. 04</span>
        </div>
      )
    }
    return <div key={node.id} {...shared} style={{ ...style, background: node.fill, border: node.stroke ? `${node.strokeWidth ?? 1}px solid ${node.stroke}` : undefined, borderRadius: node.radius }} />
  }

  const layerGroups = [
    { title: 'Navigation', ids: ['nav-logo', 'nav-work', 'nav-studio', 'nav-journal', 'nav-contact', 'nav-contact-label'] },
    { title: 'Hero', ids: ['eyebrow', 'hero-title', 'hero-body', 'hero-button', 'hero-button-label', 'hero-card', 'hero-card-shape', 'hero-card-tag', 'hero-card-tag-text'] },
    { title: 'Selected work', ids: ['section-line', 'section-kicker', 'section-count'] },
  ]

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="file-control">
          <button className="brand-mark" aria-label="Canvasly home"><span /><span /><span /></button>
          <div className="file-name-wrap">
            <button className="file-name">Cove Studio Landing Page <ChevronDown size={14} /></button>
            <div className="file-meta"><Cloud size={13} /> Saved to this device</div>
          </div>
        </div>

        <div className="toolbar" aria-label="Tools">
          {toolItems.map((item, index) => (
            <div className="tool-wrap" key={item.id}>
              {index === 6 && <span className="toolbar-separator" />}
              <IconButton label={`${item.label} (${item.shortcut})`} active={activeTool === item.id} onClick={() => setActiveTool(item.id)}>{item.icon}</IconButton>
            </div>
          ))}
          <IconButton label="Add comment" active={activeTool === 'comment'} onClick={() => { setActiveTool('comment'); setInspectorTab('prototype') }}><MessageCircle size={17} /></IconButton>
        </div>

        <div className="top-actions">
          <div className="collaborators" title="3 people have access">
            <Avatar initials="YO" color="#C7F162" small />
            <Avatar initials="MC" color="#E6B4F7" small />
            <Avatar initials="JD" color="#A4D6FF" small />
            <button className="more-collaborators">+2</button>
          </div>
          <div className="export-wrap">
            <button className="top-text-button" onClick={() => { setShowExport((value) => !value); setShowShare(false) }}>Export <ChevronDown size={14} /></button>
            {showExport && <div className="popover export-popover">
              <div className="popover-title">Export design</div>
              <button onClick={exportSvg}><ImageIcon size={16} /><span><b>SVG</b><small>Vector artwork</small></span><ArrowUpRight size={15} /></button>
              <button onClick={exportJson}><Code2 size={16} /><span><b>Design JSON</b><small>Editable document data</small></span><ArrowUpRight size={15} /></button>
            </div>}
          </div>
          <div className="share-wrap">
            <button className="share-button" onClick={() => { setShowShare((value) => !value); setShowExport(false) }}><Share2 size={15} /> Share</button>
            {showShare && <div className="popover share-popover">
              <div className="popover-title">Share this file</div>
              <div className="share-people"><Avatar initials="YO" color="#C7F162" /><span><b>You</b><small>Owner</small></span><Check size={16} /></div>
              <div className="share-people"><Avatar initials="MC" color="#E6B4F7" /><span><b>Maya Chen</b><small>Can edit</small></span><ChevronDown size={15} /></div>
              <button className="copy-link" onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Share link copied') }}><Link2 size={15} /> Copy link</button>
              <p><LockKeyhole size={13} /> Only invited people can access this file.</p>
            </div>}
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-tabs">
            <button className={leftTab === 'layers' ? 'is-active' : ''} onClick={() => setLeftTab('layers')}><Layers3 size={15} /> Layers</button>
            <button className={leftTab === 'assets' ? 'is-active' : ''} onClick={() => setLeftTab('assets')}><LayoutGrid size={15} /> Assets</button>
          </div>
          {leftTab === 'layers' ? <>
            <div className="page-heading"><span>Pages</span><button aria-label="Add page" onClick={() => setToast('New pages are coming next')}><Plus size={14} /></button></div>
            <button className="page-row is-current"><span className="page-dot" /> Landing page <MoreHorizontal size={15} /></button>
            <button className="page-row"><span className="page-dot" /> Explorations</button>
            <div className="layers-heading"><span>Layers</span><button aria-label="Search layers"><Search size={14} /></button></div>
            <div className="layer-list">
              <button className={`layer-row layer-row--frame ${selectedId === 'frame-root' ? 'is-selected' : ''}`} onClick={() => setSelectedId('')}><ChevronDown size={14} /><Frame size={14} /><span>Desktop — 1440</span><Eye size={13} /></button>
              {layerGroups.map((group) => <div className="layer-group" key={group.title}>
                <div className="layer-group-title"><ChevronDown size={13} /><span>{group.title}</span></div>
                {group.ids.map((id) => {
                  const node = nodes.find((item) => item.id === id)
                  if (!node) return null
                  const NodeIcon = node.type === 'text' ? TextCursorInput : node.type === 'ellipse' ? Circle : node.type === 'image' ? ImageIcon : Square
                  return <button key={id} className={`layer-row ${selectedId === id ? 'is-selected' : ''}`} onClick={() => setSelectedId(id)}><span className="indent" /><NodeIcon size={13} /><span>{node.name.replace(/^.*\/ /, '')}</span>{id === 'hero-card' && <MessageCircle className="layer-comment" size={12} />}</button>
                })}
              </div>)}
              {nodes.filter((node) => !layerGroups.some((group) => group.ids.includes(node.id))).map((node) => <button key={node.id} className={`layer-row ${selectedId === node.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(node.id)}><span className="indent" />{node.type === 'text' ? <TextCursorInput size={13} /> : <Square size={13} />}<span>{node.name}</span></button>)}
            </div>
          </> : <div className="assets-view">
            <div className="asset-search"><Search size={14} /><input placeholder="Search assets" /></div>
            <div className="asset-section"><span>LOCAL COMPONENTS</span><button><Plus size={14} /></button></div>
            <div className="component-card" onClick={() => addNode('rect', 120, 150)}>
              <div className="component-preview"><span /><span /><span /></div>
              <b>Primary button</b><small>Component</small>
            </div>
            <div className="component-card" onClick={() => addNode('rect', 160, 250)}>
              <div className="component-preview component-preview--card"><span /><span /></div>
              <b>Project card</b><small>Component</small>
            </div>
            <p className="assets-note">Create components from any selected layer to build your personal library.</p>
          </div>}
        </aside>

        <section className="canvas-area" ref={canvasRef} onPointerDown={handleCanvasDown}>
          <div className="canvas-instructions">{activeTool === 'select' ? 'Click a layer to select · drag to move' : activeTool === 'hand' ? 'Drag to pan around your canvas' : `Click the canvas to add a ${activeTool === 'frame' ? 'frame' : activeTool}`}</div>
          <div className="artboard-shadow" style={{ width: board.width, height: board.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          <div className="artboard" style={{ width: board.width, height: board.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <div className="artboard-label"><Monitor size={12} /> Desktop — 1440</div>
            {nodes.map(renderNode)}
          </div>
          <div className="canvas-controls" onPointerDown={(event) => event.stopPropagation()}>
            <IconButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.08).toFixed(2))))}><ZoomOut size={16} /></IconButton>
            <button className="zoom-readout" onClick={() => { setZoom(0.62); setPan({ x: 105, y: 54 }) }}>{Math.round(zoom * 100)}%</button>
            <IconButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.08).toFixed(2))))}><ZoomIn size={16} /></IconButton>
          </div>
          <div className="canvas-footer">{selected ? <><span className="selection-status"><span /> {selected.name}</span><span>{Math.round(selected.x)}, {Math.round(selected.y)}</span></> : <span>Canvasly personal edition</span>}</div>
        </section>

        <aside className="right-panel">
          <div className="inspector-tabs">
            {(['design', 'prototype', 'inspect'] as InspectorTab[]).map((tab) => <button key={tab} className={inspectorTab === tab ? 'is-active' : ''} onClick={() => setInspectorTab(tab)}>{tab}</button>)}
          </div>
          {inspectorTab === 'design' && <div className="inspector-content">
            {selected ? <>
              <div className="selection-name"><span className={`type-badge type-badge--${selected.type}`}>{selected.type === 'text' ? 'T' : selected.type === 'ellipse' ? '○' : selected.type === 'image' ? '◈' : '□'}</span><input value={selected.name} onChange={(event) => updateNode(selected.id, { name: event.target.value })} /></div>
              <div className="inspector-section position-section">
                <div className="two-up"><Field label="X" value={selected.x} onChange={(value) => updateNode(selected.id, { x: value })} /><Field label="Y" value={selected.y} onChange={(value) => updateNode(selected.id, { y: value })} /></div>
                <div className="two-up"><Field label="W" value={selected.width} onChange={(value) => updateNode(selected.id, { width: Math.max(1, value) })} /><Field label="H" value={selected.height} onChange={(value) => updateNode(selected.id, { height: Math.max(1, value) })} /></div>
                <div className="two-up"><Field label="Rotation" value={selected.rotation ?? 0} suffix="°" onChange={(value) => updateNode(selected.id, { rotation: value })} /><Field label="Opacity" value={Math.round((selected.opacity ?? 1) * 100)} suffix="%" onChange={(value) => updateNode(selected.id, { opacity: Math.max(0, Math.min(1, value / 100)) })} /></div>
              </div>
              {selected.type === 'text' ? <div className="inspector-section">
                <SectionLabel label="Typography" />
                <div className="font-field"><span>Inter</span><ChevronDown size={14} /></div>
                <div className="two-up"><Field label="Size" value={selected.fontSize ?? 16} onChange={(value) => updateNode(selected.id, { fontSize: value })} /><Field label="Weight" value={selected.fontWeight ?? 400} onChange={(value) => updateNode(selected.id, { fontWeight: value })} /></div>
                <div className="color-field"><span className="color-swatch" style={{ background: selected.color }} /><input value={selected.color ?? '#1C1C1A'} onChange={(event) => updateNode(selected.id, { color: event.target.value })} /></div>
              </div> : <div className="inspector-section">
                <SectionLabel label="Fill" action={<Plus size={14} />} />
                <div className="color-field"><input className="native-color" type="color" value={selected.fill.startsWith('#') ? selected.fill : '#C4B2FF'} onChange={(event) => updateNode(selected.id, { fill: event.target.value })} /><input value={selected.fill} onChange={(event) => updateNode(selected.id, { fill: event.target.value })} /><span className="fill-percent">{Math.round((selected.opacity ?? 1) * 100)}%</span></div>
                {selected.type !== 'ellipse' && <Field label="Corner radius" value={selected.radius ?? 0} onChange={(value) => updateNode(selected.id, { radius: value })} />}
              </div>}
              <div className="inspector-section collapsed-row"><span>Stroke</span><Plus size={14} /></div>
              <div className="inspector-section collapsed-row"><span>Effects</span><Plus size={14} /></div>
              <div className="inspector-section action-section"><button onClick={duplicateNode}><Copy size={14} /> Duplicate</button><button onClick={deleteSelected}><Trash2 size={14} /> Delete</button></div>
            </> : <EmptyInspector />}
          </div>}
          {inspectorTab === 'prototype' && <div className="prototype-panel">
            <div className="prototype-intro"><div className="prototype-icon"><Play size={18} fill="currentColor" /></div><h3>Prototype flow</h3><p>Select a layer and connect it to another frame. Your links stay in this personal file.</p><button onClick={() => setToast('Select a layer, then drag its prototype handle')}><Plus size={15} /> Add interaction</button></div>
            <div className="comments-heading"><span>COMMENTS</span><button onClick={() => setActiveTool('comment')}><MessageCircle size={14} /> Comment</button></div>
            <div className="new-comment"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={selected ? `Comment on ${selected.name}` : 'Leave a comment'} /><button disabled={!commentText.trim()} onClick={addComment}>Send</button></div>
            <div className="comment-list">{comments.filter((comment) => !comment.resolved).map((comment) => <div className="comment-card" key={comment.id}><Avatar initials={comment.initials} color={comment.color} /><div><div className="comment-author"><b>{comment.author}</b><span>{comment.time}</span></div><p>{comment.message}</p>{comment.nodeId && <button onClick={() => { setSelectedId(comment.nodeId ?? ''); setInspectorTab('design') }}><Link2 size={12} /> {nodes.find((node) => node.id === comment.nodeId)?.name ?? 'Layer'}</button>}</div><button className="resolve-comment" aria-label="Resolve comment" onClick={() => setComments((items) => items.map((item) => item.id === comment.id ? { ...item, resolved: true } : item))}><Check size={14} /></button></div>)}</div>
          </div>}
          {inspectorTab === 'inspect' && <div className="inspect-panel">
            <Code2 size={24} /><h3>Ready for handoff</h3><p>Select an element to inspect its dimensions, color values, and copy a CSS-ready snippet.</p>
            {selected && <><div className="code-preview">{`${selected.type === 'text' ? 'color' : 'background'}: ${selected.type === 'text' ? selected.color : selected.fill};`}<br />{`width: ${selected.width}px;`}<br />{`height: ${selected.height}px;`}</div><button onClick={() => { navigator.clipboard?.writeText(`width: ${selected.width}px; height: ${selected.height}px;`); setToast('CSS copied') }}><Copy size={14} /> Copy CSS</button></>}
          </div>}
        </aside>
      </section>
      <footer className="bottom-bar">
        <div><button onClick={undo} disabled={historyIndexRef.current === 0}><Undo2 size={15} /> Undo</button><button onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1}><Redo2 size={15} /> Redo</button></div>
        <div className="bottom-center"><span className="sync-dot" /> All changes saved locally</div>
        <div><button onClick={() => setInspectorTab('prototype')}><MessageCircle size={15} /> {comments.filter((item) => !item.resolved).length}</button><button onClick={saveDraft}><Cloud size={15} /> Save</button></div>
      </footer>
      {toast && <div className="toast"><Check size={15} /> {toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
    </main>
  )
}

function Field({ label, value, suffix, onChange }: { label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="numeric-field"><span>{label}</span><div><input type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} /><i>{suffix}</i></div></label>
}

function SectionLabel({ label, action }: { label: string; action?: ReactNode }) {
  return <div className="section-label"><span>{label}</span>{action && <button>{action}</button>}</div>
}

function EmptyInspector() {
  return <div className="empty-inspector"><div className="empty-icon"><MousePointer2 size={20} /></div><h3>Select a layer</h3><p>Click anything on the canvas to edit its properties, sizing, and styling.</p></div>
}

createRoot(document.getElementById('root')!).render(<App />)

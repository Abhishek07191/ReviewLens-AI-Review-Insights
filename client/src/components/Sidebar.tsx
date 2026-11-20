import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

export type PageKey = 'overview' | 'reviews' | 'products' | 'settings'

interface SidebarProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  mobileOpen: boolean
  onClose: () => void
}

const navigation: Array<{ key: PageKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'reviews', label: 'Reviews', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ activePage, onNavigate, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></div>
          <div>
            <span className="brand-name">ReviewLens</span>
            <span className="brand-subtitle">AI review insights</span>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-link ${activePage === key ? 'nav-link-active' : ''}`}
              onClick={() => {
                onNavigate(key)
                onClose()
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {key === 'reviews' && <span className="nav-count">↗</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-upload-card">
            <div className="upload-card-icon"><Upload size={17} /></div>
            <strong>Fresh insights</strong>
            <p>Upload a review CSV to uncover what customers are saying.</p>
            <button className="sidebar-upload-link" onClick={() => onNavigate('overview')}>
              Go to overview <span>→</span>
            </button>
          </div>
          <div className="workspace-status">
            <span className="status-dot" />
            <span>Local workspace</span>
          </div>
        </div>
      </aside>
    </>
  )
}

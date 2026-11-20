import { useState } from 'react'
import { AlertCircle, ArrowUpRight, Menu, RefreshCw, Upload } from 'lucide-react'
import { Sidebar, type PageKey } from './components/Sidebar'
import { OverviewPage } from './pages/OverviewPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useReviewInsights } from './hooks/useReviewInsights'
import './App.css'

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'A clear view of what customers are saying.' },
  reviews: { title: 'Reviews', subtitle: 'Understand every voice behind the numbers.' },
  products: { title: 'Products', subtitle: 'See how each product is landing with customers.' },
  settings: { title: 'Settings', subtitle: 'Your workspace, data, and AI configuration.' },
}

function App() {
  const [activePage, setActivePage] = useState<PageKey>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const {
    dashboard,
    reviewData,
    filters,
    setFilters,
    loading,
    uploading,
    error,
    setError,
    refresh,
    importFile,
  } = useReviewInsights()

  const navigateToUpload = () => {
    if (activePage !== 'overview') {
      setActivePage('overview')
      window.setTimeout(() => document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth' }), 50)
      return
    }
    document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const pageContent = () => {
    switch (activePage) {
      case 'reviews':
        return (
          <ReviewsPage
            dashboard={dashboard}
            reviews={reviewData.reviews}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )
      case 'products':
        return <ProductsPage dashboard={dashboard} />
      case 'settings':
        return <SettingsPage />
      case 'overview':
        return (
          <OverviewPage
            dashboard={dashboard}
            reviews={reviewData.reviews}
            uploading={uploading}
            onUpload={importFile}
            onViewReviews={() => setActivePage('reviews')}
          />
        )
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="topbar-title">
            <div className="breadcrumb"><span>Workspace</span><i>/</i><strong>{pageTitles[activePage].title}</strong></div>
            <p>{pageTitles[activePage].subtitle}</p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button refresh-button" onClick={() => void refresh()} aria-label="Refresh insights">
              <RefreshCw size={17} />
            </button>
            <button className="button button-primary topbar-upload" onClick={navigateToUpload}>
              <Upload size={15} /> Upload reviews
            </button>
            <span className="profile-avatar" aria-label="ReviewLens workspace">RL</span>
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button>
            {error.includes('API') && (
              <button className="error-action" onClick={() => setActivePage('settings')}>
                Settings <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-state"><span className="loading-spinner" /> Loading your insights…</div>
        ) : pageContent()}

        <footer className="app-footer">
          <span>ReviewLens <i>·</i> Customer feedback, made clear.</span>
          <span>Insights are AI-generated and should be reviewed before action.</span>
        </footer>
      </main>
    </div>
  )
}

export default App

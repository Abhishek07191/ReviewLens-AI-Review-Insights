export function DashboardSkeleton() {
  return (
    <div className="page-content dashboard-skeleton" aria-label="Loading dashboard data" aria-busy="true">
      <div className="skeleton-upload panel" />
      <div className="skeleton-heading" />
      <div className="skeleton-stats-grid">
        {Array.from({ length: 5 }, (_, index) => <div className="skeleton-stat panel" key={index} />)}
      </div>
      <div className="skeleton-chart-grid">
        <div className="skeleton-chart panel" />
        <div className="skeleton-chart panel" />
      </div>
      <div className="skeleton-highlights">
        <div className="skeleton-highlight panel" />
        <div className="skeleton-highlight panel" />
      </div>
      <div className="skeleton-table panel">
        <div className="skeleton-table-heading" />
        {Array.from({ length: 4 }, (_, index) => <div className="skeleton-table-row" key={index} />)}
      </div>
    </div>
  )
}

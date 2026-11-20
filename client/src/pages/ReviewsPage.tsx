import { ReviewsTable } from '../components/ReviewsTable'
import type { DashboardData, Review, ReviewFilters } from '../types/api'

interface ReviewsPageProps {
  dashboard: DashboardData
  reviews: Review[]
  filters: ReviewFilters
  onFiltersChange: (filters: ReviewFilters) => void
}

export function ReviewsPage({ dashboard, reviews, filters, onFiltersChange }: ReviewsPageProps) {
  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">CUSTOMER VOICE</span>
          <h2>Review library</h2>
          <p>Explore every review, its AI summary, and the themes that matter.</p>
        </div>
        <div className="page-intro-stat">
          <strong>{dashboard.totalReviewsUploaded}</strong>
          <span>reviews in latest upload</span>
        </div>
      </div>
      <ReviewsTable
        reviews={reviews}
        filters={filters}
        products={dashboard.products}
        onFiltersChange={onFiltersChange}
      />
      <p className="table-footnote">AI-generated insights are suggestions. Review customer context before taking action.</p>
    </div>
  )
}

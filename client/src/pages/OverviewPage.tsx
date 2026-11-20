import { lazy, Suspense } from 'react'
import {
  Activity,
  Clock3,
  MessageCircle,
  Minus,
  Smile,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { ReviewsTable } from '../components/ReviewsTable'
import { StatCard } from '../components/StatCard'
import { TopicHighlights } from '../components/TopicHighlights'
import { UploadDropzone } from '../components/UploadDropzone'
import type { DashboardData, Review } from '../types/api'
import type { UploadResponse } from '../types/api'
import type { UploadProgressHandler } from '../services/api'

const SentimentChart = lazy(async () => {
  const module = await import('../components/SentimentCharts')
  return { default: module.SentimentChart }
})
const ProductSentimentChart = lazy(async () => {
  const module = await import('../components/SentimentCharts')
  return { default: module.ProductSentimentChart }
})

interface OverviewPageProps {
  dashboard: DashboardData
  reviews: Review[]
  uploading: boolean
  onUpload: (file: File, onProgress?: UploadProgressHandler) => Promise<UploadResponse>
  onViewReviews: () => void
}

export function OverviewPage({
  dashboard,
  reviews,
  uploading,
  onUpload,
  onViewReviews,
}: OverviewPageProps) {
  const hasData = dashboard.totalReviewsAnalysed > 0
  const processingSeconds = Math.round(dashboard.usage.processingDurationMs / 1000)
  const processingDuration = processingSeconds >= 60
    ? `${Math.floor(processingSeconds / 60)}m ${processingSeconds % 60}s`
    : `${processingSeconds}s`

  return (
    <div className="page-content">
      <UploadDropzone uploading={uploading} onUpload={onUpload} />

      <div className="section-title-row">
        <div>
          <span className="eyebrow">YOUR STORE AT A GLANCE</span>
          <h2>Review performance</h2>
        </div>
        {hasData && <span className="freshness-indicator"><i /> Based on latest upload</span>}
      </div>

      <div className="stats-grid">
        <StatCard
          label="Reviews analyzed"
          value={dashboard.totalReviewsAnalysed.toLocaleString()}
          detail={dashboard.totalReviewsUploaded > dashboard.totalReviewsAnalysed
            ? `${dashboard.totalReviewsUploaded - dashboard.totalReviewsAnalysed} need attention`
            : 'From your latest upload'}
          icon={MessageCircle}
          tone="blue"
        />
        <StatCard
          label="Positive"
          value={`${dashboard.sentimentPercentages.positive}%`}
          detail={`${dashboard.sentimentDistribution.find(({ sentiment }) => sentiment === 'positive')?.count ?? 0} reviews`}
          icon={ThumbsUp}
          tone="green"
        />
        <StatCard
          label="Neutral"
          value={`${dashboard.sentimentPercentages.neutral}%`}
          detail={`${dashboard.sentimentDistribution.find(({ sentiment }) => sentiment === 'neutral')?.count ?? 0} reviews`}
          icon={Minus}
          tone="amber"
        />
        <StatCard
          label="Negative"
          value={`${dashboard.sentimentPercentages.negative}%`}
          detail={`${dashboard.sentimentDistribution.find(({ sentiment }) => sentiment === 'negative')?.count ?? 0} reviews`}
          icon={ThumbsDown}
          tone="red"
        />
        <StatCard
          label="Needs a reply"
          value={dashboard.reviewsNeedingReply.toLocaleString()}
          detail="Customers awaiting a response"
          icon={MessageCircle}
          tone="violet"
        />
      </div>

      <div className="chart-grid">
        <Suspense fallback={<div className="panel chart-empty">Loading chart…</div>}>
          <SentimentChart data={dashboard.sentimentDistribution} />
          <ProductSentimentChart data={dashboard.productSentiment} />
        </Suspense>
      </div>

      <TopicHighlights complaints={dashboard.topComplaints} praises={dashboard.topPraises} />

      <div className="insight-strip">
        <div className="insight-strip-icon"><Activity size={17} /></div>
        <div>
          <strong>Rating & sentiment agreement</strong>
          <span>
            {dashboard.ratingAgreementPercentage === null
              ? 'Add ratings to compare star scores with customer sentiment.'
              : `${dashboard.ratingAgreementPercentage}% agreement across ${dashboard.ratedReviews} rated reviews · ${dashboard.ratingMismatchCount} mismatch${dashboard.ratingMismatchCount === 1 ? '' : 'es'} to review`}
          </span>
        </div>
        <div className="insight-strip-metrics">
          <span><Sparkles size={14} /> {dashboard.usage.aiCalls} AI calls</span>
          <span><Star size={14} /> {dashboard.usage.cacheHits} cache hits</span>
          <span><Clock3 size={14} /> {processingDuration} processing</span>
          <span><Smile size={14} /> {dashboard.usage.uploads} uploads</span>
        </div>
      </div>

      <div className="section-title-row reviews-section-title">
        <div>
          <span className="eyebrow">VOICE OF THE CUSTOMER</span>
          <h2>Recent reviews</h2>
        </div>
        <button className="text-button" onClick={onViewReviews}>View all reviews <span>→</span></button>
      </div>
      <ReviewsTable reviews={reviews.slice(0, 5)} />
    </div>
  )
}

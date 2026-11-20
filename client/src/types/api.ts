export type Sentiment = 'positive' | 'neutral' | 'negative'
export type Topic =
  | 'quality'
  | 'delivery'
  | 'price'
  | 'packaging'
  | 'support'
  | 'size_fit'
  | 'other'

export type AnalysisStatus = 'pending' | 'completed' | 'analysis_failed'

export interface ReviewAnalysis {
  sentiment: Sentiment
  topics: Topic[]
  summary: string
  needs_reply: boolean
}

export interface Review {
  recordId: number
  uploadId: string
  reviewId: string
  product: string
  rating: number | null
  reviewText: string
  reviewHash: string
  analysisStatus: AnalysisStatus
  analysisError: string | null
  analysis: ReviewAnalysis | null
}

export interface DashboardData {
  totalReviewsAnalysed: number
  totalReviewsUploaded: number
  sentimentPercentages: Record<Sentiment, number>
  sentimentDistribution: Array<{ sentiment: Sentiment; count: number }>
  productSentiment: Array<{
    product: string
    total: number
    positive: number
    neutral: number
    negative: number
  }>
  topComplaints: Array<{ topic: Topic; count: number }>
  topPraises: Array<{ topic: Topic; count: number }>
  reviewsNeedingReply: number
  ratingAgreementPercentage: number | null
  ratingMismatchCount: number
  ratedReviews: number
  usage: {
    aiCalls: number
    cacheHits: number
    processingDurationMs: number
    uploads: number
  }
  products: string[]
}

export interface ReviewFilters {
  product: string
  sentiment: string
  topic: string
}

export interface ReviewsResponse {
  reviews: Review[]
  total: number
  limit: number
  offset: number
}

export interface UploadResponse {
  uploadId: string
  totalRows: number
  validReviews: number
  uniqueReviews: number
  emptyReviewRows: number
  malformedRows: number
  duplicateRows: number
  cacheHits: number
  aiCalls: number
  analysisFailures: number
  processingDurationMs: number
}

export interface HealthResponse {
  status: 'ok'
  aiConfigured: boolean
}

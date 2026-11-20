import { useCallback, useEffect, useState } from 'react'
import { fetchDashboard, fetchReviews, getApiErrorMessage, uploadReviews } from '../services/api'
import type {
  DashboardData,
  ReviewFilters,
  ReviewsResponse,
  UploadResponse,
} from '../types/api'

export const emptyDashboard: DashboardData = {
  totalReviewsAnalysed: 0,
  totalReviewsUploaded: 0,
  sentimentPercentages: { positive: 0, neutral: 0, negative: 0 },
  sentimentDistribution: [
    { sentiment: 'positive', count: 0 },
    { sentiment: 'neutral', count: 0 },
    { sentiment: 'negative', count: 0 },
  ],
  productSentiment: [],
  topComplaints: [],
  topPraises: [],
  reviewsNeedingReply: 0,
  ratingAgreementPercentage: null,
  ratingMismatchCount: 0,
  ratedReviews: 0,
  usage: { aiCalls: 0, cacheHits: 0, processingDurationMs: 0, uploads: 0 },
  products: [],
}

const emptyReviews: ReviewsResponse = { reviews: [], total: 0, limit: 100, offset: 0 }

export function useReviewInsights() {
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [reviewData, setReviewData] = useState(emptyReviews)
  const [filters, setFilters] = useState<ReviewFilters>({
    product: '',
    sentiment: '',
    topic: '',
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboardData, reviews] = await Promise.all([
        fetchDashboard(),
        fetchReviews(filters),
      ])
      setDashboard(dashboardData)
      setReviewData(reviews)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let active = true
    void fetchDashboard()
      .then((data) => {
        if (active) setDashboard(data)
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    void fetchReviews(filters)
      .then((data) => {
        if (active) setReviewData(data)
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError))
      })
    return () => { active = false }
  }, [filters])

  const importFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setUploading(true)
    setError('')
    try {
      const result = await uploadReviews(file)
      const [dashboardData, reviews] = await Promise.all([
        fetchDashboard(),
        fetchReviews(filters),
      ])
      setDashboard(dashboardData)
      setReviewData(reviews)
      return result
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setUploading(false)
    }
  }, [filters])

  return {
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
  }
}

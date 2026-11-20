import axios from 'axios'
import type {
  DashboardData,
  HealthResponse,
  ReviewFilters,
  ReviewsResponse,
  UploadResponse,
} from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20_000,
})

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard')
  return data
}

export async function fetchReviews(filters: ReviewFilters): Promise<ReviewsResponse> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value.length > 0),
  )
  const { data } = await api.get<ReviewsResponse>('/reviews', { params })
  return data
}

export type UploadProgressHandler = (percentage: number) => void

export async function uploadReviews(
  file: File,
  onProgress?: UploadProgressHandler,
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<UploadResponse>('/reviews/upload', formData, {
    timeout: 300_000,
    onUploadProgress: ({ loaded, total }) => {
      if (total && onProgress) {
        onProgress(Math.min(100, Math.round((loaded / total) * 100)))
      }
    },
  })
  return data
}

export async function requestReplySuggestion(recordId: number): Promise<string> {
  const { data } = await api.post<{ suggestion: string }>(
    `/reviews/${recordId}/reply-suggestion`,
  )
  return data.suggestion
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data.error ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

import { useState } from 'react'
import { Check, Copy, LoaderCircle, MessageSquareText, Sparkles, TriangleAlert } from 'lucide-react'
import { getApiErrorMessage, requestReplySuggestion } from '../services/api'
import type { Review, ReviewFilters, Sentiment, Topic } from '../types/api'

const topicLabels: Record<Topic, string> = {
  quality: 'Quality',
  delivery: 'Delivery',
  price: 'Price',
  packaging: 'Packaging',
  support: 'Support',
  size_fit: 'Size & fit',
  other: 'Other',
}

interface ReviewsTableProps {
  reviews: Review[]
  filters?: ReviewFilters
  products?: string[]
  onFiltersChange?: (filters: ReviewFilters) => void
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return <span className={`sentiment-badge sentiment-${sentiment}`}>{sentiment}</span>
}

function ReviewRow({ review }: { review: Review }) {
  const [suggestion, setSuggestion] = useState('')
  const [replyError, setReplyError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const createSuggestion = async () => {
    setLoading(true)
    setReplyError('')
    setCopied(false)
    try {
      setSuggestion(await requestReplySuggestion(review.recordId))
    } catch (error) {
      setReplyError(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const copySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(suggestion)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setReplyError('Clipboard access is unavailable in this browser.')
    }
  }

  const analysis = review.analysis

  return (
    <>
      <tr>
        <td><span className="review-id">{review.reviewId}</span></td>
        <td><span className="product-cell">{review.product}</span></td>
        <td>
          <span className={`rating-cell ${review.rating === null ? 'rating-unknown' : ''}`}>
            {review.rating === null ? '—' : `${review.rating} / 5`}
          </span>
        </td>
        <td>
          {analysis ? <SentimentBadge sentiment={analysis.sentiment} /> : (
            <span className={`analysis-status status-${review.analysisStatus}`}>
              {review.analysisStatus === 'analysis_failed' ? 'Failed' : 'Pending'}
            </span>
          )}
        </td>
        <td>
          {analysis ? (
            <div className="topic-chips">
              {analysis.topics.length > 0
                ? analysis.topics.map((topic) => <span className="topic-chip" key={topic}>{topicLabels[topic]}</span>)
                : <span className="muted-cell">—</span>}
            </div>
          ) : <span className="muted-cell">—</span>}
        </td>
        <td className="summary-cell">
          {analysis?.summary ?? (
            <span className={review.analysisStatus === 'analysis_failed' ? 'failed-summary' : 'muted-cell'}>
              {review.analysisStatus === 'analysis_failed' ? 'Analysis could not be completed.' : 'Waiting for analysis'}
            </span>
          )}
        </td>
        <td>
          {analysis?.needs_reply ? (
            <button className="reply-button" onClick={() => void createSuggestion()} disabled={loading}>
              {loading ? <LoaderCircle size={14} className="spin" /> : <MessageSquareText size={14} />}
              {suggestion ? 'Regenerate' : 'Suggest reply'}
            </button>
          ) : analysis ? (
            <span className="reply-not-needed">Not needed</span>
          ) : <span className="muted-cell">—</span>}
        </td>
      </tr>
      {(suggestion || replyError) && (
        <tr className="suggestion-row">
          <td colSpan={7}>
            {suggestion && (
              <div className="suggestion-card">
                <div className="suggestion-heading">
                  <span><Sparkles size={14} /> Suggested reply</span>
                  <button className="copy-button" onClick={() => void copySuggestion()}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p>{suggestion}</p>
                <small>Review before sending. No refund or replacement is promised.</small>
              </div>
            )}
            {replyError && <p className="inline-error"><TriangleAlert size={14} /> {replyError}</p>}
          </td>
        </tr>
      )}
    </>
  )
}

export function ReviewsTable({ reviews, filters, products = [], onFiltersChange }: ReviewsTableProps) {
  const filtered = filters !== undefined && onFiltersChange !== undefined

  return (
    <section className="panel reviews-panel">
      {filtered && (
        <div className="review-filters">
          <label>
            <span>Product</span>
            <select
              value={filters.product}
              onChange={(event) => onFiltersChange({ ...filters, product: event.target.value })}
            >
              <option value="">All products</option>
              {products.map((product) => <option key={product} value={product}>{product}</option>)}
            </select>
          </label>
          <label>
            <span>Sentiment</span>
            <select
              value={filters.sentiment}
              onChange={(event) => onFiltersChange({ ...filters, sentiment: event.target.value })}
            >
              <option value="">All sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>
          <label>
            <span>Topic</span>
            <select
              value={filters.topic}
              onChange={(event) => onFiltersChange({ ...filters, topic: event.target.value })}
            >
              <option value="">All topics</option>
              {Object.entries(topicLabels).map(([topic, label]) => <option key={topic} value={topic}>{label}</option>)}
            </select>
          </label>
          <div className="filter-result-count">{reviews.length} reviews</div>
        </div>
      )}
      <div className="table-scroll">
        <table className="reviews-table">
          <thead>
            <tr>
              <th>Review ID</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Sentiment</th>
              <th>Topics</th>
              <th>AI summary</th>
              <th>Reply</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  <div className="table-empty-icon"><MessageSquareText size={19} /></div>
                  <strong>No reviews to show</strong>
                  <span>Upload a CSV or adjust the filters to see review insights.</span>
                </td>
              </tr>
            ) : reviews.map((review) => <ReviewRow key={review.recordId} review={review} />)}
          </tbody>
        </table>
      </div>
    </section>
  )
}

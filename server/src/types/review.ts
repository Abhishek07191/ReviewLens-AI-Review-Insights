export type AnalysisStatus = 'pending' | 'completed' | 'analysis_failed';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Topic =
  | 'quality'
  | 'delivery'
  | 'price'
  | 'packaging'
  | 'support'
  | 'size_fit'
  | 'other';

export interface CleanReview {
  reviewId: string;
  product: string;
  rating: number | null;
  reviewText: string;
  normalizedHash: string;
  rowNumber: number;
}

export interface ReviewAnalysis {
  sentiment: Sentiment;
  topics: Topic[];
  summary: string;
  needs_reply: boolean;
}

export interface UploadedReview extends CleanReview {
  analysisStatus: AnalysisStatus;
  analysis: ReviewAnalysis | null;
  analysisError: string | null;
}

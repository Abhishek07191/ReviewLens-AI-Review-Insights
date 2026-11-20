import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'
import { getApiErrorMessage, type UploadProgressHandler } from '../services/api'
import type { UploadResponse } from '../types/api'

interface UploadDropzoneProps {
  uploading: boolean
  onUpload: (file: File, onProgress?: UploadProgressHandler) => Promise<UploadResponse>
}

export function UploadDropzone({ uploading, onUpload }: UploadDropzoneProps) {
  const [message, setMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const startUpload = async (file: File) => {
    setSelectedFile(file)
    setUploadProgress(0)
    setMessage('')
    setUploadError('')
    setResult(null)
    try {
      const uploadResult = await onUpload(file, setUploadProgress)
      const successfulAnalyses = Math.max(0, uploadResult.uniqueReviews - uploadResult.analysisFailures)
      setResult(uploadResult)
      setMessage(
        uploadResult.analysisFailures > 0
          ? `${successfulAnalyses} unique reviews analyzed · ${uploadResult.analysisFailures} unique analysis failure${uploadResult.analysisFailures === 1 ? '' : 's'}.`
          : `${successfulAnalyses} unique reviews analyzed successfully.`,
      )
    } catch (error) {
      setUploadError(getApiErrorMessage(error))
    }
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
    onDropAccepted: async ([file]) => {
      if (file) await startUpload(file)
    },
  })

  const rejectionMessage = fileRejections[0]?.errors[0]?.code === 'file-too-large'
    ? 'That file is over 5 MB. Choose a smaller CSV.'
    : fileRejections.length > 0
      ? 'Choose a .csv file with a maximum size of 5 MB.'
      : ''
  const visibleUploadError = !uploading && selectedFile && !result ? uploadError : ''

  return (
    <section
      id="upload-card"
      className={`upload-dropzone ${isDragActive ? 'upload-dropzone-active' : ''}`}
      {...getRootProps()}
      aria-label="Upload customer reviews CSV"
    >
      <input {...getInputProps({ id: 'review-upload-input' })} />
      <div className="dropzone-icon">
        {uploading ? <LoaderCircle className="spin" size={23} /> : <UploadCloud size={24} />}
      </div>
      <div className="dropzone-copy">
        <h3>
          {uploading
            ? uploadProgress >= 100 ? 'Analyzing your reviews…' : 'Uploading your CSV…'
            : isDragActive ? 'Drop your CSV here' : 'Bring your reviews into focus'}
        </h3>
        <p>
          {uploading
            ? uploadProgress >= 100
              ? 'The file is uploaded. Reviews are being analyzed in small batches.'
              : 'Uploading your file to the server.'
            : 'Drag and drop your CSV, or click to browse. Your file stays on this server.'}
        </p>
        <div className="dropzone-meta">
          <span><FileSpreadsheet size={14} /> CSV format</span>
          <span className="meta-divider" />
          <span>Up to 5 MB</span>
          <span className="meta-divider" />
          <span><ShieldCheck size={14} /> Private by design</span>
        </div>
        {selectedFile && (
          <div className="selected-file" aria-live="polite">
            <FileSpreadsheet size={15} />
            <span className="selected-file-name">{selectedFile.name}</span>
            {uploading && uploadProgress < 100 && <span>{uploadProgress}%</span>}
            {uploading && uploadProgress >= 100 && <span>Processing</span>}
          </div>
        )}
        {uploading && (
          <div
            className="upload-progress-track"
            role="progressbar"
            aria-label="CSV file upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
          >
            <span style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>
      <button
        className="button button-primary dropzone-button"
        type="button"
        disabled={uploading}
      >
        {uploading ? 'Processing' : 'Upload CSV'}
      </button>
      {(rejectionMessage || message || visibleUploadError) && (
        <div
          className={`dropzone-message ${rejectionMessage || visibleUploadError ? 'message-error' : 'message-success'}`}
          role={rejectionMessage || visibleUploadError ? 'alert' : 'status'}
        >
          {rejectionMessage || visibleUploadError || message}
          {visibleUploadError && selectedFile && (
            <button
              className="upload-retry-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void startUpload(selectedFile)
              }}
            >
              Try again
            </button>
          )}
          {result && (
            <span className="upload-result-details">
              {result.uniqueReviews - result.analysisFailures} unique analyzed · {result.analysisFailures} unique failed · {result.cacheHits} cache hits · {result.aiCalls} AI calls
            </span>
          )}
        </div>
      )}
    </section>
  )
}

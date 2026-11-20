import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'
import type { UploadResponse } from '../types/api'

interface UploadDropzoneProps {
  uploading: boolean
  onUpload: (file: File) => Promise<UploadResponse | null>
}

export function UploadDropzone({ uploading, onUpload }: UploadDropzoneProps) {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<UploadResponse | null>(null)

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
    onDropAccepted: async ([file]) => {
      if (!file) return
      setMessage('')
      setResult(null)
      const uploadResult = await onUpload(file)
      if (uploadResult) {
        setResult(uploadResult)
        setMessage(
          uploadResult.analysisFailures > 0
            ? `${uploadResult.analysisFailures} review${uploadResult.analysisFailures === 1 ? '' : 's'} could not be analyzed.`
            : 'Your review insights are ready.',
        )
      }
    },
  })

  const rejectionMessage = fileRejections[0]?.errors[0]?.code === 'file-too-large'
    ? 'That file is over 5 MB. Choose a smaller CSV.'
    : fileRejections.length > 0
      ? 'Choose a .csv file with a maximum size of 5 MB.'
      : ''

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
        <h3>{uploading ? 'Analyzing your reviews…' : isDragActive ? 'Drop your CSV here' : 'Bring your reviews into focus'}</h3>
        <p>
          {uploading
            ? 'Reviews are analyzed in small batches. This may take a moment.'
            : 'Drag and drop your CSV, or click to browse. Your file stays on this server.'}
        </p>
        <div className="dropzone-meta">
          <span><FileSpreadsheet size={14} /> CSV format</span>
          <span className="meta-divider" />
          <span>Up to 5 MB</span>
          <span className="meta-divider" />
          <span><ShieldCheck size={14} /> Private by design</span>
        </div>
      </div>
      <button className="button button-primary dropzone-button" type="button" disabled={uploading}>
        {uploading ? 'Processing' : 'Upload CSV'}
      </button>
      {(rejectionMessage || message) && (
        <div className={`dropzone-message ${rejectionMessage ? 'message-error' : 'message-success'}`} role="status">
          {rejectionMessage || message}
          {result && (
            <span className="upload-result-details">
              {result.validReviews} valid · {result.uniqueReviews} unique · {result.cacheHits} cached · {result.aiCalls} AI calls
            </span>
          )}
        </div>
      )}
    </section>
  )
}

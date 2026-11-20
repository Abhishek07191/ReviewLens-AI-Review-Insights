import { Package, TrendingUp } from 'lucide-react'
import type { DashboardData } from '../types/api'

interface ProductsPageProps {
  dashboard: DashboardData
}

export function ProductsPage({ dashboard }: ProductsPageProps) {
  const { productSentiment } = dashboard

  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">CATALOG INSIGHTS</span>
          <h2>Product performance</h2>
          <p>Understand customer sentiment and review volume for each product.</p>
        </div>
        <div className="page-intro-stat">
          <strong>{dashboard.products.length}</strong>
          <span>products in latest upload</span>
        </div>
      </div>
      <section className="panel product-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Sentiment by product</h2>
            <p>Only completed analyses are included in sentiment percentages.</p>
          </div>
        </div>
        {productSentiment.length === 0 ? (
          <div className="page-empty">
            <div className="empty-illustration"><Package size={24} /></div>
            <strong>No product insights yet</strong>
            <span>Upload a review CSV to compare how customers feel about your products.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr><th>Product</th><th>Analyzed reviews</th><th>Positive</th><th>Neutral</th><th>Negative</th><th>Positive share</th></tr>
              </thead>
              <tbody>
                {productSentiment.map((product) => {
                  const percentage = product.total > 0 ? Math.round((product.positive / product.total) * 100) : 0
                  return (
                    <tr key={product.product}>
                      <td><span className="product-name-cell"><Package size={16} /> {product.product}</span></td>
                      <td>{product.total}</td>
                      <td><span className="product-count positive-count">{product.positive}</span></td>
                      <td><span className="product-count neutral-count">{product.neutral}</span></td>
                      <td><span className="product-count negative-count">{product.negative}</span></td>
                      <td>
                        <div className="share-cell">
                          <div className="share-track"><i style={{ width: `${percentage}%` }} /></div>
                          <strong>{percentage}%</strong>
                          {percentage >= 70 && <TrendingUp size={14} className="share-trend" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

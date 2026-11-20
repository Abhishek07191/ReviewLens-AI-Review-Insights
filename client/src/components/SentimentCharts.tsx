import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  CartesianGrid,
  BarChart,
} from 'recharts'
import type { DashboardData, Sentiment } from '../types/api'

const sentimentColors: Record<Sentiment, string> = {
  positive: '#20a775',
  neutral: '#efa940',
  negative: '#ee6b69',
}

const sentimentLabels: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
}

interface ChartCardProps {
  title: string
  description: string
  action?: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, description, action, children, className = '' }: ChartCardProps) {
  return (
    <section className={`panel chart-panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action && <span className="panel-action">{action}</span>}
      </div>
      {children}
    </section>
  )
}

export function SentimentChart({ data }: { data: DashboardData['sentimentDistribution'] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  return (
    <ChartCard title="Sentiment distribution" description="How customers feel across your reviews">
      {total === 0 ? (
        <div className="chart-empty">Sentiment data will appear after your first analysis.</div>
      ) : (
        <div className="sentiment-chart">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="sentiment"
                  innerRadius={66}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke="none"
                >
                  {data.map((entry) => <Cell key={entry.sentiment} fill={sentimentColors[entry.sentiment]} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, sentimentLabels[name as Sentiment]]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{total}</strong>
              <span>reviews</span>
            </div>
          </div>
          <div className="sentiment-legend">
            {data.map(({ sentiment, count }) => (
              <div className="legend-row" key={sentiment}>
                <span className="legend-label">
                  <i style={{ backgroundColor: sentimentColors[sentiment] }} />
                  {sentimentLabels[sentiment]}
                </span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  )
}

export function ProductSentimentChart({ data }: { data: DashboardData['productSentiment'] }) {
  return (
    <ChartCard
      title="Sentiment by product"
      description="See what is resonating across your catalog"
      action={data.length > 0 ? `${data.length} products` : undefined}
    >
      {data.length === 0 ? (
        <div className="chart-empty">Product comparisons will appear after your first analysis.</div>
      ) : (
        <div className="product-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.slice(0, 7)} layout="vertical" margin={{ top: 2, right: 4, left: 8, bottom: 2 }} barCategoryGap={13}>
              <CartesianGrid horizontal={false} stroke="#edf0f5" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="product"
                width={102}
                tick={{ fill: '#788197', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: '#f5f7fb' }} />
              <Legend iconType="circle" iconSize={7} />
              <Bar dataKey="positive" name="Positive" stackId="sentiment" fill={sentimentColors.positive} radius={[4, 0, 0, 4]} />
              <Bar dataKey="neutral" name="Neutral" stackId="sentiment" fill={sentimentColors.neutral} />
              <Bar dataKey="negative" name="Negative" stackId="sentiment" fill={sentimentColors.negative} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

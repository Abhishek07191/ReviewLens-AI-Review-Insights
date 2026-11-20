import { ArrowDownRight, ArrowUpRight, MessageCircleWarning, Sparkles } from 'lucide-react'
import type { Topic } from '../types/api'

const topicLabels: Record<Topic, string> = {
  quality: 'Product quality',
  delivery: 'Delivery',
  price: 'Price & value',
  packaging: 'Packaging',
  support: 'Customer support',
  size_fit: 'Size & fit',
  other: 'Other feedback',
}

interface TopicHighlightsProps {
  complaints: Array<{ topic: Topic; count: number }>
  praises: Array<{ topic: Topic; count: number }>
}

function TopicList({
  title,
  subtitle,
  topics,
  positive,
}: {
  title: string
  subtitle: string
  topics: Array<{ topic: Topic; count: number }>
  positive: boolean
}) {
  const Icon = positive ? Sparkles : MessageCircleWarning
  return (
    <section className="panel topics-panel">
      <div className="panel-heading">
        <div>
          <div className={`topic-heading-icon ${positive ? 'topic-positive' : 'topic-negative'}`}><Icon size={16} /></div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {positive ? <ArrowUpRight size={17} className="topic-direction direction-positive" /> : <ArrowDownRight size={17} className="topic-direction direction-negative" />}
      </div>
      {topics.length === 0 ? (
        <div className="topic-empty">Insights will show up as reviews are analyzed.</div>
      ) : (
        <div className="topic-list">
          {topics.slice(0, 3).map(({ topic, count }, index) => (
            <div className="topic-row" key={topic}>
              <span className="topic-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="topic-name">{topicLabels[topic]}</span>
              <span className={`topic-count ${positive ? 'topic-count-positive' : ''}`}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function TopicHighlights({ complaints, praises }: TopicHighlightsProps) {
  return (
    <div className="topic-grid">
      <TopicList
        title="Top complaints"
        subtitle="Themes in negative feedback"
        topics={complaints}
        positive={false}
      />
      <TopicList
        title="Top praises"
        subtitle="What customers love most"
        topics={praises}
        positive
      />
    </div>
  )
}

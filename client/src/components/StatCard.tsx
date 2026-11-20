import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet'
}

export function StatCard({ label, value, detail, icon: Icon, tone }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}><Icon size={18} strokeWidth={2} /></div>
      <div className="stat-card-copy">
        <span className="stat-label">{label}</span>
        <div className="stat-value">{value}</div>
        <span className="stat-detail">{detail}</span>
      </div>
    </article>
  )
}

import { Badge } from '@/components/ui'

const MAP = {
  active: { variant: 'green', label: 'Active' },
  completed: { variant: 'green', label: 'Completed' },
  approved: { variant: 'green', label: 'Approved' },
  pending: { variant: 'yellow', label: 'Pending' },
  pending_approval: { variant: 'yellow', label: 'Pending Approval' },
  overdue: { variant: 'red', label: 'Overdue' },
  rejected: { variant: 'red', label: 'Rejected' },
  failed: { variant: 'red', label: 'Failed' },
  in_progress: { variant: 'blue', label: 'In Progress' },
  todo: { variant: 'gray', label: 'To Do' },
  managed: { variant: 'gray', label: 'Managed' },
}

export default function StatusBadge({ status, label }) {
  const cfg = MAP[status] || { variant: 'gray', label: label || status }
  return <Badge variant={cfg.variant}>{label || cfg.label}</Badge>
}

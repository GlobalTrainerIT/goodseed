export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/40">
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-seed-100 text-3xl dark:bg-seed-900/40">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

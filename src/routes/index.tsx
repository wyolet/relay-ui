import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => Promise.resolve({ status: 'ok', ui: 'relay-ui v0.0.1' }),
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-12 max-w-lg w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Relay UI</h1>
        <p className="text-gray-500 mb-8">Operator admin interface for Wyolet Relay</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-700">TanStack Router — active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-700">TanStack Query — {isLoading ? 'loading…' : data?.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-700">Tailwind v4 — active</span>
          </div>
        </div>
      </div>
    </div>
  )
}

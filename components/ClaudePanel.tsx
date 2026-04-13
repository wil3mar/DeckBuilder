export default function ClaudePanel() {
  return (
    <div className="w-[220px] min-w-[220px] bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-indigo-400">✦ Claude</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-gray-600 text-center">
          Claude integration coming in Plan 2.
        </p>
      </div>
    </div>
  )
}

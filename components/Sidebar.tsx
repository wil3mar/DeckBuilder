'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavCounts {
  cards: number
  characters: number
  pillars: number
  milestones: number
  effects: number
  flags: number
}

const NAV_ITEMS = [
  { href: '/',           label: 'Cards',      countKey: 'cards'      as keyof NavCounts },
  { href: '/characters', label: 'Characters', countKey: 'characters' as keyof NavCounts },
  { href: '/pillars',    label: 'Pillars',    countKey: 'pillars'    as keyof NavCounts },
  { href: '/milestones', label: 'Milestones', countKey: 'milestones' as keyof NavCounts },
  { href: '/effects',    label: 'Effects',    countKey: 'effects'    as keyof NavCounts },
  { href: '/flags',      label: 'Flags',      countKey: 'flags'      as keyof NavCounts },
  { href: '/balance',    label: 'Balance',    countKey: null },
  { href: '/export',     label: 'Export',     countKey: null },
  { href: '/settings',   label: 'Settings',   countKey: null },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [counts, setCounts] = useState<NavCounts | null>(null)

  useEffect(() => {
    function fetchCounts() {
      fetch('/api/nav-counts').then(r => r.json()).then(setCounts)
    }

    fetchCounts()
    window.addEventListener('game:content-updated', fetchCounts)
    return () => window.removeEventListener('game:content-updated', fetchCounts)
  }, [])

  return (
    <nav className="w-[200px] min-w-[200px] bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Deck Builder
        </span>
      </div>

      <ul className="flex-1 py-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          const count = item.countKey && counts ? counts[item.countKey] : null
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-900/40 text-indigo-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.label}</span>
                {count !== null && (
                  <span className="text-xs text-gray-600 tabular-nums">{count}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BrainstormFlow from '@/components/BrainstormFlow'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Deck Builder',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasContent = false
  if (user) {
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
    hasContent = (count ?? 0) > 0
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        {user ? (
          hasContent
            ? <AppShell>{children}</AppShell>
            : <BrainstormFlow />
        ) : (
          children
        )}
      </body>
    </html>
  )
}

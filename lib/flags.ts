import type { ICommand } from '@/lib/types'

export interface FlagExtraction {
  setFlags: string[]
  clearFlags: string[]
}

export function extractFlagsFromConsequences(commands: ICommand[]): FlagExtraction {
  const setFlags: string[] = []
  const clearFlags: string[] = []

  for (const cmd of commands) {
    if (cmd.type === 'set_flag') {
      setFlags.push(cmd.id)
    } else if (cmd.type === 'clear_flag') {
      clearFlags.push(cmd.id)
    }
  }

  return { setFlags, clearFlags }
}

'use client'

import { useState, useEffect } from 'react'

interface QueryHistoryItem {
  id: string
  query: string
  timestamp: string
  status: 'success' | 'error'
}

const STORAGE_KEY = 'ai-query-history'
const MAX_HISTORY = 20

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load query history:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage on changes
  const saveHistory = (newHistory: QueryHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
    } catch (error) {
      console.error('Failed to save query history:', error)
    }
  }

  const addQuery = (query: string, status: 'success' | 'error' = 'success') => {
    const newItem: QueryHistoryItem = {
      id: crypto.randomUUID(),
      query,
      timestamp: new Date().toISOString(),
      status,
    }

    setHistory((prev) => {
      // Remove duplicate queries (keep most recent)
      const filtered = prev.filter((item) => item.query !== query)
      // Add new item at the beginning
      const updated = [newItem, ...filtered]
      // Limit history size
      const trimmed = updated.slice(0, MAX_HISTORY)
      saveHistory(trimmed)
      return trimmed
    })
  }

  const removeQuery = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      saveHistory(updated)
      return updated
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const getRecentQueries = (count: number = 5): QueryHistoryItem[] => {
    return history.slice(0, count)
  }

  return {
    history,
    isLoaded,
    addQuery,
    removeQuery,
    clearHistory,
    getRecentQueries,
  }
}

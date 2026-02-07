"use client"

import { useQuery } from "@tanstack/react-query"
import { Customer } from "@/lib/repositories/customer.repository"

interface UseCustomersOptions {
  enabled?: boolean
  staleTime?: number
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, staleTime = 60 * 1000 } = options

  return useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const response = await fetch("/api/customers")

      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }

      const data = await response.json()
      return data
    },
    enabled,
    staleTime,
  })
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async (): Promise<Customer | null> => {
      const response = await fetch(`/api/customers/${customerId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error("Failed to fetch customer")
      }

      return response.json()
    },
    enabled: !!customerId,
  })
}

export function useCustomerStats() {
  return useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stats")

      if (!response.ok) {
        throw new Error("Failed to fetch customer stats")
      }

      return response.json()
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  })
}

"use client"

import { useState } from "react"
import { DataTable } from "@/components/dashboard/DataTable"
import { customerColumns } from "@/components/dashboard/table/columns"
import { useCustomers } from "@/lib/hooks/useCustomers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react"

// Mock data for demonstration
const mockCustomers = [
  {
    id: "1",
    organization_id: "org_1",
    name: "John Smith",
    email: "john.smith@example.com",
    company: "Acme Corporation",
    industry: "Technology",
    total_revenue: 150000,
    last_purchase_date: new Date("2024-01-15"),
    status: "active" as const,
    deleted_at: null,
    created_at: new Date("2023-06-01"),
    updated_at: new Date("2024-01-15"),
  },
  {
    id: "2",
    organization_id: "org_1",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    company: "Global Industries",
    industry: "Manufacturing",
    total_revenue: 280000,
    last_purchase_date: new Date("2024-01-10"),
    status: "active" as const,
    deleted_at: null,
    created_at: new Date("2023-03-15"),
    updated_at: new Date("2024-01-10"),
  },
  {
    id: "3",
    organization_id: "org_1",
    name: "Michael Brown",
    email: "mbrown@example.com",
    company: "Brown & Associates",
    industry: "Consulting",
    total_revenue: 75000,
    last_purchase_date: new Date("2023-12-01"),
    status: "inactive" as const,
    deleted_at: null,
    created_at: new Date("2023-09-20"),
    updated_at: new Date("2023-12-01"),
  },
  {
    id: "4",
    organization_id: "org_1",
    name: "Emily Davis",
    email: "emily.d@example.com",
    company: "Tech Startups Inc",
    industry: "Technology",
    total_revenue: 320000,
    last_purchase_date: new Date("2024-01-18"),
    status: "active" as const,
    deleted_at: null,
    created_at: new Date("2022-11-10"),
    updated_at: new Date("2024-01-18"),
  },
  {
    id: "5",
    organization_id: "org_1",
    name: "Robert Wilson",
    email: "rwilson@example.com",
    company: "Wilson Logistics",
    industry: "Transportation",
    total_revenue: 195000,
    last_purchase_date: new Date("2023-08-22"),
    status: "churned" as const,
    deleted_at: null,
    created_at: new Date("2023-01-05"),
    updated_at: new Date("2023-08-22"),
  },
]

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const { data: customers, isLoading, error, refetch } = useCustomers()

  // Use mock data if no real data available
  const displayData = customers && customers.length > 0 ? customers : mockCustomers

  const handleExport = (format: "csv" | "excel") => {
    console.log(`Exporting as ${format}`)
    // In a real app, this would call the appropriate export function
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load customer data. Please try again later.</p>
            <Button onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage and view your customer relationships
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{displayData.length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {displayData.filter((c) => c.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((displayData.filter((c) => c.status === "active").length / displayData.length) * 100).toFixed(0)}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${displayData.reduce((acc, c) => acc + (c.total_revenue || 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${Math.round(displayData.reduce((acc, c) => acc + (c.total_revenue || 0), 0) / displayData.length).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per customer
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <DataTable
              columns={customerColumns}
              data={displayData}
              searchPlaceholder="Search customers..."
              pageSize={10}
              onExport={handleExport}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

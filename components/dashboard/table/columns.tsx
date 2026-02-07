import { ColumnDef } from "@tanstack/react-table"
import { Customer } from "@/lib/repositories/customer.repository"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowUpDown,
  MoreHorizontal,
  Mail,
  Building2,
  Calendar,
  DollarSign,
} from "lucide-react"
import { format } from "date-fns"

// Status badge variant mapping
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  churned: "destructive",
}

// Format currency helper
const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format date helper
const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "-"
  return format(new Date(date), "MMM d, yyyy")
}

// Customer column definitions for TanStack Table
export const customerColumns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 p-0 hover:bg-transparent hover:text-foreground"
        >
          Name
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const email = row.getValue("email") as string | null
      
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{name}</span>
          {email && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {email}
            </span>
          )}
        </div>
      )
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 p-0 hover:bg-transparent hover:text-foreground"
        >
          <Building2 className="h-4 w-4 mr-1" />
          Company
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const company = row.getValue("company") as string | null
      const industry = row.getValue("industry") as string | null
      
      if (!company) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{company}</span>
          {industry && (
            <span className="text-xs text-muted-foreground">{industry}</span>
          )}
        </div>
      )
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    accessorKey: "total_revenue",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 p-0 hover:bg-transparent hover:text-foreground justify-end"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Revenue
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = row.getValue("total_revenue") as number
      return (
        <div className="text-right font-medium">
          {formatCurrency(amount)}
        </div>
      )
    },
    enableColumnFilter: false,
    enableSorting: true,
  },
  {
    accessorKey: "last_purchase_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 p-0 hover:bg-transparent hover:text-foreground"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Last Purchase
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("last_purchase_date") as Date | null
      return (
        <div className="flex items-center gap-1 text-sm">
          {formatDate(date)}
        </div>
      )
    },
    enableColumnFilter: false,
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={statusVariants[status] || "outline"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original
      
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              // Handle view customer details
              console.log("View customer:", customer.id)
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]

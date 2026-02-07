import NextError from 'next/error'
import { useRouteError, useErrorContext } from 'next-error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong!</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. Please try again or report this issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Error Details</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error.message || 'Unknown error occurred'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    Sentry.captureException(error)
                    alert('Error reported to the team. Thank you!')
                  }}
                >
                  Report Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

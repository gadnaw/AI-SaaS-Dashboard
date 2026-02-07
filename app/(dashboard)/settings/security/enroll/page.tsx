import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { enrollMFA } from '@/lib/auth/mfa'

import { startEnrollment, completeEnrollment } from './actions'

export default async function MFAEnrollmentPage({
  searchParams,
}: {
  searchParams: { required?: string }
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Start enrollment on page load (server action)
  const enrollment = await enrollMFA()

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        {searchParams.required && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm font-medium">
              MFA is required for admin accounts. Please set up two-factor authentication to continue.
            </p>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6">Set up two-factor authentication</h1>

        <p className="text-gray-600 mb-6">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
        </p>

        <div className="flex justify-center mb-6">
          <img
            src={enrollment.qrCode}
            alt="MFA QR Code"
            className="border rounded-lg p-4 bg-white"
            width={200}
            height={200}
          />
        </div>

        <p className="text-sm text-gray-600 mb-2">
          Or enter this code manually:
        </p>

        <code className="block bg-gray-100 p-4 rounded-lg mb-6 text-sm font-mono text-center tracking-widest">
          {enrollment.secret}
        </code>

        <form action={completeEnrollment} className="space-y-4">
          <input type="hidden" name="factorId" value={enrollment.factorId} />

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Enter 6-digit code from your app
            </label>
            <input
              type="text"
              id="code"
              name="code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              placeholder="000000"
              className="w-full border border-gray-300 rounded-md px-4 py-3 font-mono text-center text-lg tracking-widest focus:border-blue-500 focus:ring-blue-500"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Verify and enable MFA
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/settings/security"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </a>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Need help?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Download an authenticator app on your phone</li>
            <li>• Scan the QR code or enter the code manually</li>
            <li>• Enter the 6-digit code to verify setup</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-gray-900">
            AI Dashboard
          </a>
          <p className="text-gray-600 mt-2">Powered by OpenAI Function Calling</p>
        </div>
        {children}
      </div>
    </div>
  )
}

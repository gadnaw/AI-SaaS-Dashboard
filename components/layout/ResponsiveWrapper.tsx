'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Breakpoint context
interface ResponsiveContextValue {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

const ResponsiveContext = createContext<ResponsiveContextValue | null>(null)

interface ResponsiveProviderProps {
  children: ReactNode
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const [dimensions, setDimensions] = useState({ width: 0, isMobile: true, isTablet: false, isDesktop: false })

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth
      setDimensions({
        width,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1200,
        isDesktop: width >= 1200,
      })
    }

    // Initial measurement
    updateDimensions()

    // Listen for resize
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  return (
    <ResponsiveContext.Provider value={dimensions}>
      {children}
    </ResponsiveContext.Provider>
  )
}

export function useResponsive() {
  const context = useContext(ResponsiveContext)
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveProvider')
  }
  return context
}

// Hook for individual breakpoint checks
export function useBreakpoint() {
  const { isMobile, isTablet, isDesktop, width } = useResponsive()
  return { isMobile, isTablet, isDesktop, width }
}

// Responsive wrapper component
interface ResponsiveWrapperProps {
  children: ReactNode
  showOnMobile?: boolean
  showOnTablet?: boolean
  showOnDesktop?: boolean
  className?: string
}

export function ResponsiveWrapper({
  children,
  showOnMobile = true,
  showOnTablet = true,
  showOnDesktop = true,
  className,
}: ResponsiveWrapperProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive()

  const shouldShow =
    (isMobile && showOnMobile) ||
    (isTablet && showOnTablet) ||
    (isDesktop && showOnDesktop)

  if (!shouldShow) return null

  return <div className={className}>{children}</div>
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabaseBrowser as supabase } from '@/lib/supabase/client'
import Cookies from 'js-cookie'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 1. Handle mounting for hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2. Handle authentication and authorization checks
  useEffect(() => {
    if (!mounted) return

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const publicRoutes = ['/login', '/forgot-password', '/reset-password']
        const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r))

        if (!user) {
          if (!isPublicRoute) {
            router.push('/login')
          }
          return
        }

        // Logged in: Check permissions and library access
        const { data: staff } = await supabase
          .from('staff')
          .select('role, library_ids')
          .eq('user_id', user.id)
          .single()

        const bypassAll = ['/renew', '/blocked', '/change-password', '/select-library', '/api']
        const isBypass = bypassAll.some(r => pathname.startsWith(r))

        if (!isBypass && !isPublicRoute) {
          const libraryIds: string[] = staff?.library_ids || []

          if (libraryIds.length > 1 && !Cookies.get('active_library_id')) {
            router.push('/select-library')
            return
          }

          const selectedLibId = Cookies.get('active_library_id') || libraryIds[0]

          if (selectedLibId) {
            const { data: library } = await supabase
              .from('libraries')
              .select('subscription_end, subscription_status, name')
              .eq('id', selectedLibId)
              .single()

            if (library) {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const subEnd = new Date(library.subscription_end)
              subEnd.setHours(0, 0, 0, 0)

              if (today > subEnd) {
                if (staff?.role === 'owner') {
                  router.push(`/renew?library_id=${selectedLibId}`)
                  return
                } else {
                  router.push('/blocked')
                  return
                }
              }
            }
          }
        }

        if (isPublicRoute) {
          router.push('/')
          return
        }
      } catch (err) {
        console.error('Auth check failed', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [mounted, pathname, router])

  // Hydration mismatch fix & hook stability: always render children
  // but cover with a spinner until auth/loading is complete
  return (
    <>
      {(!mounted || loading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      )}
      {children}
    </>
  )
}

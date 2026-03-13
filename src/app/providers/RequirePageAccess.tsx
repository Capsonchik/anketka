'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { hasUserPermission } from '@/entities/user'
import { useBootstrapData } from '@/shared/lib/bootstrap-data'
import { serviceMenuItems } from '@/widgets/anketa-service-shell'

type RoutePermissionRule = {
  routePrefix: string
  permissionKey: string
}

const routePermissionRules: RoutePermissionRule[] = [
  { routePrefix: '/clients', permissionKey: 'page.clients.view' },
  { routePrefix: '/team', permissionKey: 'page.team.view' },
  { routePrefix: '/dashboard', permissionKey: 'page.dashboard.view' },
  { routePrefix: '/projects', permissionKey: 'page.projects.view' },
  { routePrefix: '/price-monitoring', permissionKey: 'page.price-monitoring.view' },
  { routePrefix: '/survey-builder', permissionKey: 'page.survey-builder.view' },
  { routePrefix: '/reports', permissionKey: 'page.reports.view' },
  { routePrefix: '/permissions', permissionKey: 'page.permissions.view' },
  { routePrefix: '/survey', permissionKey: 'page.reports.view' },
]

function findRequiredPermission (pathname: string): string | null {
  for (const item of routePermissionRules) {
    if (pathname === item.routePrefix || pathname.startsWith(`${item.routePrefix}/`)) {
      return item.permissionKey
    }
  }
  return null
}

function resolveFirstAllowedPath (permissions: string[] | undefined, platformRole: string | undefined): string {
  if ((platformRole || 'user') === 'owner') return '/dashboard'
  const first = serviceMenuItems.find((item) => (permissions || []).includes(item.permissionKey))
  return first?.href || '/login'
}

export function RequirePageAccess ({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { me, isLoading } = useBootstrapData()

  const requiredPermission = useMemo(() => {
    if (!pathname) return null
    return findRequiredPermission(pathname)
  }, [pathname])

  const hasAccess = useMemo(() => {
    if (!requiredPermission) return true
    return hasUserPermission(me, requiredPermission)
  }, [me, requiredPermission])

  useEffect(() => {
    if (isLoading || !pathname || !me || hasAccess) return
    const fallbackPath = resolveFirstAllowedPath(me.permissions, me.platformRole)
    if (fallbackPath && fallbackPath !== pathname) {
      router.replace(fallbackPath)
      router.refresh()
      return
    }
    router.replace('/login')
    router.refresh()
  }, [hasAccess, isLoading, me, pathname, router])

  if (isLoading) return null
  if (!hasAccess) return null
  return children
}


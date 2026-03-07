import type { ChecklistItemPublic, ShopPointItem } from '../model/types'

export type ProjectDashboardStats = {
  pointsCount: number
  chainsCount: number
  checklistsCount: number
  checklistItemsCount: number
  coveredPointsCount: number
  coveragePct: number
  topChains: Array<{ chainId: string; chainName: string; pointsCount: number; isCovered: boolean }>
  uncoveredChains: Array<{ chainId: string; chainName: string; pointsCount: number }>
}

export function computeProjectDashboard (opts: {
  points: ShopPointItem[]
  checklists: ChecklistItemPublic[]
  topChainsLimit?: number
}): ProjectDashboardStats {
  const points = opts.points ?? []
  const checklists = opts.checklists ?? []
  const topLimit = Math.max(1, opts.topChainsLimit ?? 8)

  const checklistChainIds = new Set<string>()
  for (const c of checklists) {
    if (c?.chain?.id) checklistChainIds.add(c.chain.id)
  }

  const byChain = new Map<string, { chainId: string; chainName: string; pointsCount: number }>()
  for (const p of points) {
    const id = p?.chain?.id
    if (!id) continue
    const prev = byChain.get(id)
    if (prev) {
      prev.pointsCount += 1
    } else {
      byChain.set(id, {
        chainId: id,
        chainName: p.chain?.name || '—',
        pointsCount: 1,
      })
    }
  }

  const pointsCount = points.length
  const chainsCount = byChain.size
  const checklistsCount = checklists.length
  const checklistItemsCount = checklists.reduce((acc, c) => acc + (Number(c.itemsCount) || 0), 0)

  let coveredPointsCount = 0
  for (const p of points) {
    const id = p?.chain?.id
    if (id && checklistChainIds.has(id)) coveredPointsCount += 1
  }
  const coveragePct = pointsCount > 0 ? Math.round((coveredPointsCount / pointsCount) * 100) : 0

  const chainsSorted = Array.from(byChain.values()).sort((a, b) => b.pointsCount - a.pointsCount)
  const topChains = chainsSorted.slice(0, topLimit).map((x) => ({
    chainId: x.chainId,
    chainName: x.chainName,
    pointsCount: x.pointsCount,
    isCovered: checklistChainIds.has(x.chainId),
  }))

  const uncoveredChains = chainsSorted
    .filter((x) => !checklistChainIds.has(x.chainId))
    .map((x) => ({ chainId: x.chainId, chainName: x.chainName, pointsCount: x.pointsCount }))

  return {
    pointsCount,
    chainsCount,
    checklistsCount,
    checklistItemsCount,
    coveredPointsCount,
    coveragePct,
    topChains,
    uncoveredChains,
  }
}


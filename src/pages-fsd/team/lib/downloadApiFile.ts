import axiosMainRequest from '@/api-config/api-config'

function extractFilename (contentDisposition: string | undefined | null) {
  if (!contentDisposition) return null

  const filenameStar = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i)?.[1]?.trim()
  if (filenameStar) {
    const value = filenameStar.replace(/^UTF-8''/i, '').replace(/^['"]|['"]$/g, '')
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const filename = contentDisposition.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim()
  if (!filename) return null
  return filename.replace(/^['"]|['"]$/g, '')
}

export async function downloadApiFile ({
  url,
  params,
  fallbackFilename,
}: {
  url: string
  params?: Record<string, string | number | boolean | null | undefined>
  fallbackFilename: string
}) {
  const res = await axiosMainRequest.get<Blob>(url, {
    params,
    responseType: 'blob',
  })

  const contentType = String((res.headers as Record<string, string | undefined>)['content-type'] ?? '')
  if (contentType.includes('application/json')) {
    const text = await res.data.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { detail?: unknown }
      if (Array.isArray(parsed.detail)) {
        message = parsed.detail.map((d) => String(d)).slice(0, 5).join('; ')
      } else if (typeof parsed.detail === 'string') {
        message = parsed.detail
      }
    } catch {
      // keep raw text
    }
    throw new Error(message || 'Не удалось скачать файл')
  }

  const cd = (res.headers as Record<string, string | undefined>)['content-disposition']
  const filename = extractFilename(cd) ?? fallbackFilename
  const objectUrl = URL.createObjectURL(res.data)

  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

import axiosMainRequest from '@/api-config/api-config'

function extractFilename (contentDisposition: string | undefined | null) {
  if (!contentDisposition) return null

  // filename*=UTF-8''...
  const filenameStar = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i)?.[1]?.trim()
  if (filenameStar) {
    const v = filenameStar.replace(/^UTF-8''/i, '').replace(/^['"]|['"]$/g, '')
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }

  const filename = contentDisposition.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim()
  if (!filename) return null
  return filename.replace(/^['"]|['"]$/g, '')
}

export async function downloadApiFile ({
  url,
  params,
  headers,
  fallbackFilename,
}: {
  url: string
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  fallbackFilename: string
}) {
  const res = await axiosMainRequest.get<Blob>(url, {
    params,
    headers,
    responseType: 'blob',
  })

  const contentType = String((res.headers as Record<string, string | undefined>)['content-type'] ?? '')
  if (contentType.includes('application/json')) {
    const text = await res.data.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { detail?: unknown }
      if (Array.isArray(parsed.detail)) {
        message = parsed.detail
          .map((d) => {
            if (typeof d === 'string') return d
            if (d && typeof d === 'object') {
              const msg = (d as any).msg
              const loc = (d as any).loc
              return msg ? `${msg}${loc ? ` (${String(loc)})` : ''}` : JSON.stringify(d)
            }
            return String(d)
          })
          .slice(0, 5)
          .join('; ')
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

  const blob = res.data
  const objectUrl = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}


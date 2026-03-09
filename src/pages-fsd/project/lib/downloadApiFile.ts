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


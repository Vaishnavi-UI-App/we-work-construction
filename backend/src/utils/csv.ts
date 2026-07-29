export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (cell: string | number) => {
    const s = String(cell ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map(row => row.map(escape).join(','))
  return lines.join('\r\n')
}

export function sendCsv(res: any, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}

import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4001/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const fetchSites    = () => api.get('/sites').then(r => r.data)
export const createSite    = (name: string) => api.post('/sites', { name }).then(r => r.data)
export const fetchReports  = () => api.get('/reports/summary').then(r => r.data)
export const sendChatMessage = (message: string) => api.post('/chatbot', { message }).then(r => r.data)

// Downloads a report as a file, using the auth header already attached above
// (a plain <a href> or window.location can't carry the bearer token).
async function downloadReport(url: string, fallbackFilename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] || fallbackFilename
  const blobUrl = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
export const downloadBranchReport    = () => downloadReport('/reports/export/branches', 'branch-wise-report.csv')
export const downloadOrderedByReport = () => downloadReport('/reports/export/ordered-by', 'person-wise-report.csv')
export const downloadManagerReport   = () => downloadReport('/reports/export/managers', 'manager-wise-report.csv')

// Expenses (direct)
export const fetchExpenses  = () => api.get('/wallet').then(r =>
  (r.data as any[]).flatMap((s: any) => (s.expenses || []).map((e: any) => ({ ...e, site: { name: s.name } })))
)
export const approveExpense = (id: number) => api.put(`/expenses/${id}/approve`, {}).then(r => r.data)

export const fetchCustomers  = () => api.get('/customers').then(r => r.data)
export const createCustomer  = (d: any) => api.post('/customers', d).then(r => r.data)
export const updateCustomer  = (id: number, d: any) => api.put(`/customers/${id}`, d).then(r => r.data)
export const deleteCustomer  = (id: number) => api.delete(`/customers/${id}`).then(r => r.data)

export const fetchVendors  = () => api.get('/vendors').then(r => r.data)
export const createVendor  = (d: any) => api.post('/vendors', d).then(r => r.data)
export const updateVendor  = (id: number, d: any) => api.put(`/vendors/${id}`, d).then(r => r.data)
export const deleteVendor  = (id: number) => api.delete(`/vendors/${id}`).then(r => r.data)

// Wallet / Expense Tracker
export const fetchWallets      = () => api.get('/wallet').then(r => r.data)
export const addFund           = (d: any) => api.post('/wallet/fund', d).then(r => r.data)
export const addTrackedExpense = (d: FormData) => api.post('/wallet/expense', d, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
export const updateTrackedExpense = (id: number, d: FormData) => api.put(`/wallet/expense/${id}`, d, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
export const deleteTrackedExpense = (id: number) => api.delete(`/wallet/expense/${id}`).then(r => r.data)
export const fetchSiteHistory  = (siteId: number) => api.get(`/wallet/history/${siteId}`).then(r => r.data)
export const fetchOrderedByPeople = () => api.get('/wallet/ordered-by').then(r => r.data)
export const addOrderedByPerson   = (name: string) => api.post('/wallet/ordered-by', { name }).then(r => r.data)
export const fetchExpenseCategories = () => api.get('/wallet/categories').then(r => r.data)
export const addExpenseCategory     = (name: string) => api.post('/wallet/categories', { name }).then(r => r.data)

// User Management
export const fetchUsers  = () => api.get('/users').then(r => r.data)
export const createUser  = (d: any) => api.post('/users', d).then(r => r.data)
export const updateUser  = (id: number, d: any) => api.put(`/users/${id}`, d).then(r => r.data)
export const deleteUser  = (id: number) => api.delete(`/users/${id}`).then(r => r.data)

// Role Management
export const fetchRoles  = () => api.get('/roles').then(r => r.data)
export const createRole  = (d: any) => api.post('/roles', d).then(r => r.data)
export const updateRole  = (id: number, d: any) => api.put(`/roles/${id}`, d).then(r => r.data)
export const deleteRole  = (id: number) => api.delete(`/roles/${id}`).then(r => r.data)

// Attendance
export const checkIn        = (d: any) => api.post('/attendance/checkin', d).then(r => r.data)
export const checkOut       = (d: any) => api.post('/attendance/checkout', d).then(r => r.data)
export const fetchMyAttendance   = () => api.get('/attendance/my').then(r => r.data)
export const fetchTodayAttendance = () => api.get('/attendance/today').then(r => r.data)
export const fetchAllAttendance  = (date?: string) => api.get('/attendance/all', { params: date ? { date } : {} }).then(r => r.data)
export const reverseGeocode = (lat: number, lng: number) => api.get('/geocode/reverse', { params: { lat, lng } }).then(r => r.data.address as string)

// Organisation Master
export const fetchOrgProfile   = () => api.get('/organisation/profile').then(r => r.data)
export const updateOrgProfile  = (d: any) => api.put('/organisation/profile', d).then(r => r.data)
export const fetchOrgDocuments = () => api.get('/organisation/documents').then(r => r.data)
export const uploadOrgDocument = (d: FormData) => api.post('/organisation/documents', d, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
export const deleteOrgDocument = (id: number) => api.delete(`/organisation/documents/${id}`).then(r => r.data)

// Billing / GST Tax Invoice
export const fetchBills        = () => api.get('/billing').then(r => r.data)
export const fetchBill         = (id: number) => api.get(`/billing/${id}`).then(r => r.data)
export const fetchNextBillNo   = () => api.get('/billing/next-number').then(r => r.data)
export const fetchHsnCodes     = () => api.get('/billing/hsn').then(r => r.data)
export const createBill        = (d: any) => api.post('/billing', d).then(r => r.data)
export const deleteBill        = (id: number) => api.delete(`/billing/${id}`).then(r => r.data)

// Delivery Challan
export const fetchChallans      = () => api.get('/delivery-challans').then(r => r.data)
export const fetchChallan       = (id: number) => api.get(`/delivery-challans/${id}`).then(r => r.data)
export const fetchNextChallanNo = () => api.get('/delivery-challans/next-number').then(r => r.data)
export const createChallan      = (d: any) => api.post('/delivery-challans', d).then(r => r.data)
export const deleteChallan      = (id: number) => api.delete(`/delivery-challans/${id}`).then(r => r.data)

// Simple Delivery Challan (plain pad-style challan — no GST/HSN)
export const fetchSimpleChallans      = () => api.get('/simple-challans').then(r => r.data)
export const fetchSimpleChallan       = (id: number) => api.get(`/simple-challans/${id}`).then(r => r.data)
export const fetchNextSimpleChallanNo = () => api.get('/simple-challans/next-number').then(r => r.data)
export const createSimpleChallan      = (d: any) => api.post('/simple-challans', d).then(r => r.data)
export const deleteSimpleChallan      = (id: number) => api.delete(`/simple-challans/${id}`).then(r => r.data)

// Banking / Customer Ledger
export const fetchBankingSummary = () => api.get('/banking/summary').then(r => r.data)
export const fetchPayments       = (customerName?: string) => api.get('/banking/payments', { params: customerName ? { customerName } : {} }).then(r => r.data)
export const addPayment          = (d: any) => api.post('/banking/payments', d).then(r => r.data)
export const deletePayment       = (id: number) => api.delete(`/banking/payments/${id}`).then(r => r.data)
export const downloadBankingReport = (customerName?: string) =>
  downloadReport(
    customerName ? `/banking/export?customerName=${encodeURIComponent(customerName)}` : '/banking/export',
    customerName ? `${customerName}-ledger.csv` : 'customer-ledger.csv'
  )

export default api

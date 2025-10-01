import { useState, useEffect } from 'react'
import { Search, User, TrendingUp, Shield, AlertTriangle, CheckCircle, XCircle, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx'
import './App.css'
import { fetchJson } from '@/lib/utils.js'

function App() {
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [driver, setDriver] = useState(null)
  const [incentives, setIncentives] = useState([])
  const [bans, setBans] = useState([])
  const [activeBans, setActiveBans] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  // Admin auth state
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [authError, setAuthError] = useState('')
  const [uploadSummary, setUploadSummary] = useState(null)
  const [uploadErrors, setUploadErrors] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) {
      setAdminToken(stored)
    }
  }, [])

  const loginAdmin = async () => {
    setAuthError('')
    try {
      const data = await fetchJson('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      })
      setAdminToken(data.token)
      localStorage.setItem('admin_token', data.token)
      setAdminPassword('')
    } catch (e) {
      setAuthError(e.message)
    }
  }

  const logoutAdmin = () => {
    setAdminToken('')
    localStorage.removeItem('admin_token')
  }

  const handleUpload = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadSummary(null)
    setUploadErrors([])
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await fetchJson('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      })
      setUploadSummary(data.summary)
      setUploadErrors(data.errors || [])
    } catch (e) {
      setUploadSummary(null)
      setUploadErrors([{ row: '-', error: e.message }])
    } finally {
      setUploading(false)
      // clear the input value so the same file can be re-selected
      event.target.value = ''
    }
  }

  const searchDriver = async () => {
    if (!searchId.trim()) {
      setError('Please enter a driver ID')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Search for driver
      const searchData = await fetchJson(`/api/drivers/search?driver_id=${encodeURIComponent(searchId)}`)
      
      if (searchData.length === 0) {
        setError('No driver found with this ID')
        setDriver(null)
        setIncentives([])
        setBans([])
        setActiveBans([])
        setStats(null)
        return
      }
      
      const foundDriver = searchData[0]
      setDriver(foundDriver)
      
      // Fetch driver incentives
      const incentivesData = await fetchJson(`/api/drivers/${foundDriver.driver_id}/incentives`)
      setIncentives(incentivesData.incentives || [])
      
      // Fetch driver bans
      const bansData = await fetchJson(`/api/drivers/${foundDriver.driver_id}/bans`)
      setBans(bansData.bans || [])
      
      // Fetch active bans
      const activeBansData = await fetchJson(`/api/drivers/${foundDriver.driver_id}/bans/active`)
      setActiveBans(activeBansData.active_bans || [])
      
      // Fetch driver stats
      const statsData = await fetchJson(`/api/drivers/${foundDriver.driver_id}/stats`)
      setStats(statsData.stats || null)
      
    } catch (err) {
      setError(err.message)
      setDriver(null)
      setIncentives([])
      setBans([])
      setActiveBans([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'achieved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Achieved</Badge>
      case 'not_achieved':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Not Achieved</Badge>
      case 'banned':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><Ban className="w-3 h-3 mr-1" />Banned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDriverStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'banned':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Banned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Driver Incentive Tracker
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Search and track driver incentive status, performance, and ban history
          </p>
        </div>

        {/* Admin Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              {adminToken ? 'You are logged in as admin.' : 'Login to upload CSV/XLSX incentive data.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!adminToken ? (
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Admin username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="md:flex-1"
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="md:flex-1"
                />
                <Button onClick={loginAdmin}>Login</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <Input type="file" accept=".csv,.xlsx" onChange={handleUpload} />
                  <Button variant="secondary" onClick={logoutAdmin}>Logout</Button>
                </div>
                {uploading && <span className="text-sm text-gray-600">Uploading...</span>}
              </div>
            )}
            {authError && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            {uploadSummary && (
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                <p>Created: <b>{uploadSummary.created}</b>, Updated: <b>{uploadSummary.updated}</b>, Failed: <b>{uploadSummary.failed}</b></p>
              </div>
            )}
            {uploadErrors && uploadErrors.length > 0 && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {uploadErrors.slice(0, 5).map((e, i) => (
                  <p key={i}>Row {e.row}: {e.error}</p>
                ))}
                {uploadErrors.length > 5 && (
                  <p className="opacity-80">and {uploadErrors.length - 5} more...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Driver
            </CardTitle>
            <CardDescription>
              Enter a driver ID to view their incentive history and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter Driver ID (e.g., DRV001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchDriver()}
                className="flex-1"
              />
              <Button onClick={searchDriver} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {driver && (
          <div className="space-y-6">
            {/* Driver Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Driver Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver ID</p>
                    <p className="text-lg font-semibold">{driver.driver_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-lg font-semibold">{driver.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <div className="mt-1">{getDriverStatusBadge(driver.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Date</p>
                    <p className="text-lg font-semibold">{formatDate(driver.registration_date)}</p>
                  </div>
                </div>
                {driver.email && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-lg">{driver.email}</p>
                  </div>
                )}
                {driver.phone && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-lg">{driver.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Achievement Rate</p>
                        <p className="text-2xl font-bold text-green-600">{stats.achievement_rate}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Incentives</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_incentive_value)}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fraud Trips</p>
                        <p className="text-2xl font-bold text-red-600">{stats.total_fraud_trips}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Bans</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.active_bans_count}</p>
                      </div>
                      <Shield className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Active Bans Alert */}
            {activeBans.length > 0 && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <Ban className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">Active Bans</AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  This driver currently has {activeBans.length} active ban(s). Check the Ban History tab for details.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabs for detailed information */}
            <Tabs defaultValue="incentives" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incentives">Incentive History</TabsTrigger>
                <TabsTrigger value="bans">Ban History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="incentives" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Incentive History</CardTitle>
                    <CardDescription>
                      Daily incentive records showing performance and fraud detection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incentives.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Incentive Value</TableHead>
                              <TableHead>Trips</TableHead>
                              <TableHead>Fraud Trips</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {incentives.slice(0, 10).map((incentive) => (
                              <TableRow key={incentive.id}>
                                <TableCell>{formatDate(incentive.date)}</TableCell>
                                <TableCell>{getStatusBadge(incentive.status)}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(incentive.incentive_value)}
                                </TableCell>
                                <TableCell>
                                  {incentive.completed_trips} / {incentive.target_trips}
                                </TableCell>
                                <TableCell>
                                  {incentive.fraud_trips > 0 ? (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      {incentive.fraud_trips}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-500">0</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                  {incentive.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {incentives.length > 10 && (
                          <p className="text-sm text-gray-500 mt-4 text-center">
                            Showing latest 10 records out of {incentives.length} total records
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No incentive records found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bans" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ban History</CardTitle>
                    <CardDescription>
                      All ban records including active and expired bans
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bans.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Created By</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bans.map((ban) => (
                              <TableRow key={ban.id}>
                                <TableCell>
                                  {ban.is_active ? (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Expired</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{ban.ban_reason}</TableCell>
                                <TableCell>{formatDate(ban.ban_start_date)}</TableCell>
                                <TableCell>
                                  {ban.ban_end_date ? formatDate(ban.ban_end_date) : 'Permanent'}
                                </TableCell>
                                <TableCell>{ban.created_by || '-'}</TableCell>
                                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                  {ban.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No ban records found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

export default App


import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import { addAuditLog } from '../lib/auditLog'
import Layout from '../components/layout/Layout'
import { ArrowLeft, Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

export default function Employees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [userPermissions, setUserPermissions] = useState([])

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    other_name: '',
    gender: '',
    phone: '',
    nin: '',
    address: '',
    date_of_birth: '',
    email: '',
    status: 'active'
  })

  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState('first_name')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    loadUserPermissions()
  }, [])

  async function loadUserPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions || [])
  }

  // OPTIMIZED: useCallback prevents unnecessary re-fetches
  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    
    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,nin.ilike.%${search}%`)
    }

    if (genderFilter) {
      query = query.eq('gender', genderFilter)
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    const from = (currentPage - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error:', error)
    } else {
      setEmployees(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }, [search, genderFilter, statusFilter, currentPage, pageSize, sortField, sortOrder])

  // OPTIMIZED: dependency array includes fetchEmployees
  useEffect(() => {
    if (userPermissions.includes('View Employee')) {
      fetchEmployees()
    }
  }, [fetchEmployees, userPermissions])

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (editingEmployee) {
      if (!userPermissions.includes('Edit Employee')) {
        alert('No permission to edit')
        setLoading(false)
        return
      }
      
      const { error } = await supabase
        .from('employees')
        .update(formData)
        .eq('id', editingEmployee.id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        toast.success('Employee updated')
        await addAuditLog('EDIT_EMPLOYEE', `Edited: ${formData.first_name} ${formData.last_name}`)
        setShowForm(false)
        setEditingEmployee(null)
        fetchEmployees()
      }
    } else {
      if (!userPermissions.includes('Create Employee')) {
        alert('No permission to create')
        setLoading(false)
        return
      }
      
      const { error } = await supabase
        .from('employees')
        .insert([formData])

      if (error) {
        alert('Error: ' + error.message)
      } else {
        toast.success('Employee created')
        await addAuditLog('CREATE_EMPLOYEE', `Created: ${formData.first_name} ${formData.last_name}`)
        setShowForm(false)
        fetchEmployees()
      }
    }
    setLoading(false)
  }

  function handleEdit(employee) {
    if (!userPermissions.includes('Edit Employee')) {
      alert('No permission to edit')
      return
    }
    setEditingEmployee(employee)
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      other_name: employee.other_name || '',
      gender: employee.gender,
      phone: employee.phone,
      nin: employee.nin,
      address: employee.address || '',
      date_of_birth: employee.date_of_birth,
      email: employee.email,
      status: employee.status
    })
    setShowForm(true)
  }

  async function handleDelete(id, firstName, lastName) {
    if (!userPermissions.includes('Delete Employee')) {
      alert('No permission to delete')
      return
    }
    
    if (window.confirm(`Deactivate ${firstName} ${lastName}?`)) {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', id)
  
      if (error) {
        alert('Error: ' + error.message)
      } else {
        toast.success('Employee deactivated')
        await addAuditLog('DELETE_EMPLOYEE', `Deactivated: ${firstName} ${lastName}`)
        fetchEmployees()
      }
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  function exportToExcel() {
    const exportData = employees.map(emp => ({
      'First Name': emp.first_name,
      'Last Name': emp.last_name,
      'Other Name': emp.other_name || '',
      'Gender': emp.gender,
      'Phone': emp.phone,
      'Email': emp.email,
      'NIN': emp.nin,
      'Address': emp.address || '',
      'Date of Birth': emp.date_of_birth,
      'Status': emp.status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Employees')
    XLSX.writeFile(wb, `employees_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel file downloaded')
  }

  function exportToPDF() {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(16)
    doc.text('Employee List', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
    
    const tableData = employees.map(emp => [
      `${emp.first_name} ${emp.last_name}`,
      emp.gender,
      emp.phone,
      emp.email,
      emp.date_of_birth,
      emp.status
    ])

    autoTable(doc, {
      head: [['Name', 'Gender', 'Phone', 'Email', 'DOB', 'Status']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 10, right: 10 }
    })

    doc.save(`employees_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF file downloaded')
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  if (!userPermissions.includes('View Employee') && userPermissions.length > 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-500 mt-2">No permission to view employees</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>👥 Employee Management</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage employee records</p>
          </div>
        </div>

        {/* Search, Filters, Export Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
            />
          </div>
          
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          {/* Excel Button - Green */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: '#10b981', border: 'none', color: 'white' }}
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

          {/* PDF Button - Red */}
          <button
            onClick={exportToPDF}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: '#ef4444', border: 'none', color: 'white' }}
          >
            <FileText size={16} />
            PDF
          </button>

          {userPermissions.includes('Create Employee') && (
            <button 
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + Add Employee
            </button>
          )}
        </div>

        {/* Employee Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th onClick={() => handleSort('first_name')} className="text-left py-3 px-3 font-semibold cursor-pointer hover:text-amber-500" style={{ color: 'var(--text-primary)' }}>
                      Name {sortField === 'first_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Gender</th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Phone</th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Email</th>
                    <th onClick={() => handleSort('date_of_birth')} className="text-left py-3 px-3 font-semibold cursor-pointer hover:text-amber-500" style={{ color: 'var(--text-primary)' }}>
                      DOB
                    </th>
                    <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                    <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name} {emp.other_name || ''}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{emp.gender}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{emp.phone}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{emp.date_of_birth}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {emp.status}
                        </span>
                       </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {userPermissions.includes('Edit Employee') && (
                            <button onClick={() => handleEdit(emp)} className="text-blue-500 hover:text-blue-600" title="Edit">✏️</button>
                          )}
                          {userPermissions.includes('Delete Employee') && (
                            <button onClick={() => handleDelete(emp.id, emp.first_name, emp.last_name)} className="text-red-500 hover:text-red-600" title="Delete">🗑️</button>
                          )}
                        </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total: {totalCount} employees</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50" style={{ borderColor: 'var(--border)' }}><ChevronLeft size={16} /></button>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50" style={{ borderColor: 'var(--border)' }}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" name="first_name" placeholder="First Name *" value={formData.first_name} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <input type="text" name="last_name" placeholder="Last Name *" value={formData.last_name} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <input type="text" name="other_name" placeholder="Other Name" value={formData.other_name} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} />
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required>
                  <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
                <input type="tel" name="phone" placeholder="Phone *" value={formData.phone} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <input type="text" name="nin" placeholder="NIN *" value={formData.nin} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} />
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <input type="email" name="email" placeholder="Email *" value={formData.email} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }} required />
                <select name="status" value={formData.status} onChange={handleInputChange} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg transition">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg transition" style={{ border: `1px solid var(--border)`, color: 'var(--text-primary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
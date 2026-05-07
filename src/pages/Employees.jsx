import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUserPermissions } from '../lib/permissions'
import './Employees.css'
import { addAuditLog } from '../lib/auditLog'



export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [userPermissions, setUserPermissions] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date()) 


  
  // Form state
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

  // Search, filter, pagination
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState('first_name')
  const [sortOrder, setSortOrder] = useState('asc')

  // Load dark mode and user permissions
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
    }
    loadUserPermissions()
  }, [])

  
  // ADD THIS EFFECT
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ... other effects

  // ========== FUNCTIONS ==========
  // ADD THIS FUNCTION
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }


  async function loadUserPermissions() {
    const { permissions } = await getCurrentUserPermissions()
    setUserPermissions(permissions)
  }

  // Load employees
  useEffect(() => {
    if (userPermissions.includes('View Employee')) {
      fetchEmployees()
    }
  }, [search, genderFilter, statusFilter, currentPage, pageSize, sortField, sortOrder, userPermissions])

  async function fetchEmployees() {
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
  }

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (editingEmployee) {
      if (!userPermissions.includes('Edit Employee')) {
        alert('You do not have permission to edit employees')
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
        alert('Employee updated successfully')
        await addAuditLog('EDIT_EMPLOYEE', `Edited employee: ${formData.first_name} ${formData.last_name}`)
        setShowForm(false)
        setEditingEmployee(null)
        fetchEmployees()
      }
    } else {
      if (!userPermissions.includes('Create Employee')) {
        alert('You do not have permission to create employees')
        setLoading(false)
        return
      }
      
      const { error } = await supabase
        .from('employees')
        .insert([formData])

      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Employee created successfully')
        await addAuditLog('CREATE_EMPLOYEE', `Created employee: ${formData.first_name} ${formData.last_name}`)
        setShowForm(false)
        fetchEmployees()
      }
    }
    setLoading(false)
  }

  function handleEdit(employee) {
    if (!userPermissions.includes('Edit Employee')) {
      alert('You do not have permission to edit employees')
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
      alert('You do not have permission to delete employees')
      return
    }
    
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', id)
  
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Employee deactivated')
        await addAuditLog('DELETE_EMPLOYEE', `Deactivated employee: ${firstName} ${lastName}`)  // ✅ Now works
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

  const totalPages = Math.ceil(totalCount / pageSize)

  // Check if user has permission to view employees
  if (!userPermissions.includes('View Employee') && userPermissions.length > 0) {
    return (
      <div className={darkMode ? 'employees-container-dark' : 'employees-container-light'}>
        <div className="employees-box" style={{ textAlign: 'center', padding: 50 }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view employees.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={darkMode ? 'employees-container-dark' : 'employees-container-light'}>
      <div className="employees-box">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>👥 Employee Management</h1>
            <p>Manage employee records</p>
          </div>
          {userPermissions.includes('Create Employee') && (
            <button 
              onClick={() => {
                setEditingEmployee(null)
                setFormData({
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
                setShowForm(true)
              }}
              className="add-employee-btn"
            >
              + Add Employee
            </button>
          )}
        </div>
        {/* Time */}
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <span style={{ fontSize: 14, opacity: 0.7 }}> {formatTime(currentTime)}</span>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, email, phone, NIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="employee-search-input"
            style={{ flex: 2, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="filter-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="page-size-select"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* Employee Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>Loading...</div>
        ) : (
          <>
            <div className="employee-table-responsive">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('first_name')} style={{ cursor: 'pointer' }}>
                      Name {sortField === 'first_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th onClick={() => handleSort('date_of_birth')} style={{ cursor: 'pointer' }}>
                      DOB {sortField === 'date_of_birth' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>{emp.first_name} {emp.last_name} {emp.other_name || ''}</td>
                      <td>{emp.gender}</td>
                      <td>{emp.phone}</td>
                      <td>{emp.email}</td>
                      <td>{emp.date_of_birth}</td>
                      <td>
                        <span className={emp.status === 'active' ? 'status-active' : 'status-inactive'}>
                          {emp.status}
                        </span>
                       </td>
                       <td>
                        {userPermissions.includes('Edit Employee') && (
                          <button onClick={() => handleEdit(emp)} className="edit-btn">Edit</button>
                        )}
                        {userPermissions.includes('Delete Employee') && (
                          <button onClick={() => handleDelete(emp.id, emp.first_name, emp.last_name)} className="delete-btn">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>Total: {totalCount} employees</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <input type="text" name="first_name" placeholder="First Name *" value={formData.first_name} onChange={handleInputChange} required />
                <input type="text" name="last_name" placeholder="Last Name *" value={formData.last_name} onChange={handleInputChange} required />
                <input type="text" name="other_name" placeholder="Other Name" value={formData.other_name} onChange={handleInputChange} />
                <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <input type="tel" name="phone" placeholder="Phone *" value={formData.phone} onChange={handleInputChange} required />
                <input type="text" name="nin" placeholder="NIN *" value={formData.nin} onChange={handleInputChange} required />
                <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} />
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} required />
                <input type="email" name="email" placeholder="Email *" value={formData.email} onChange={handleInputChange} required />
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="save-btn">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
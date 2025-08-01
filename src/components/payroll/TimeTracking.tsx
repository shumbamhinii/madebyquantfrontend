import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Space,
  Tag,
  message,
  Spin // Added Spin for loading indicator
} from 'antd';
import {
  ClockCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined // Added LoadingOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

// Define the Employee and TimeEntry types to match your backend API structure
// Assuming Employee.id is a string (UUID)
export interface Employee {
  id: string; // UUID from backend
  name: string;
  email: string;
  position: string;
  id_number: string;
  contact_number: string;
  address: string;
  start_date: string;
  payment_type: 'hourly' | 'salary';
  base_salary: number | null;
  hourly_rate: number | null;
  hours_worked_total: number; // Total hours on the employee record
  // Assuming bank details are directly on the employee object from the joined query
  bank_name: string | null;
  account_number: string | null;
  branch_code: string | null;
  bankDetails?: { // If your backend also sends a nested bankDetails object
    bank_id: string;
    account_holder: string;
    bank_name: string;
    account_number: string;
    branch_code: string;
  };
}

export interface TimeEntry {
  id: string; // UUID from backend
  employee_id: string; // References Employee.id (UUID)
  date: string; // YYYY-MM-DD
  hours_worked: number; // Snake case for backend consistency
  description: string;
  status: 'pending' | 'approved' | 'rejected' | null; // Changed to allow null
}

const { Option } = Select;
const { TextArea } = Input;

interface TimeTrackingProps {
  employees: Employee[]; // List of employees, likely passed from PayrollDashboard
  onEmployeeDataChange: () => Promise<void>; // Callback to refresh employee list in parent
}

const TimeTracking: React.FC<TimeTrackingProps> = ({
  employees,
  onEmployeeDataChange
}) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized function to fetch time entries from the backend
  const fetchTimeEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      // NOTE: Your backend has a GET /employees/:employeeId/time-entries
      // but no general GET /time-entries.
      // For now, this will fetch ALL time entries by iterating through employees.
      // This can be inefficient for many employees. Consider adding a general
      // GET /time-entries endpoint to your backend for better performance.
      let allEntries: TimeEntry[] = [];
      for (const employee of employees) {
        try {
          const response = await fetch(`https://madebyquantbackend.onrender.com/employees/${employee.id}/time-entries`);
          if (!response.ok) {
            console.warn(`Failed to fetch time entries for employee ${employee.id}: ${response.status}`);
            continue; // Skip to next employee if fetch fails
          }
          const data: TimeEntry[] = await response.json();
          allEntries = allEntries.concat(data);
        } catch (innerError) {
          console.error(`Error fetching time entries for employee ${employee.id}:`, innerError);
        }
      }
      setTimeEntries(allEntries);
    } catch (error) {
      console.error('Error fetching time entries (overall):', error);
      message.error(`Failed to load time entries: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [employees]); // Dependency on employees to re-fetch if employee list changes

  // Fetch time entries on component mount and when employees change
  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  const handleAddTimeEntry = async (values: any) => {
    console.log("1. handleAddTimeEntry STARTED with values:", values); // Debugging log
    setIsSubmitting(true);
    try {
      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        hours_worked: values.hoursWorked, // Use hours_worked for backend
        description: values.description,
        status: 'pending' // New entries start as pending (though backend sets this)
      };

      console.log("2. Sending payload to backend:", payload); // Debugging log

      // CORRECTED: Use the backend's expected endpoint structure
      const response = await fetch(`https://madebyquantbackend.onrender.com/employees/${values.employeeId}/time-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log("3. Backend response status:", response.status); // Debugging log
      const responseData = await response.json(); // Always try to parse JSON for more details
      console.log("4. Backend response data:", responseData); // Debugging log


      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add time entry: ${response.status}`);
      }

      // Backend returns a success message or the created ID, not necessarily the full entry
      // For now, we'll re-fetch all entries to ensure consistency.
      form.resetFields();
      setIsModalVisible(false);
      message.success('Time entry added successfully and awaiting approval!');
      await fetchTimeEntries(); // Re-fetch all entries to update the table
      console.log("5. Time entry successfully added and UI updated."); // Debugging log
    } catch (error) {
      console.error('Error adding time entry:', error);
      message.error(`Failed to add time entry: ${error instanceof Error ? error.message : String(error)}`);
      console.log("6. Error caught during time entry addition."); // Debugging log
    } finally {
      setIsSubmitting(false);
      console.log("7. isSubmitting set to false."); // Debugging log
    }
  };

  const handleApproveEntry = async (entryId: string, employeeId: string, hoursWorked: number) => {
    setIsLoading(true); // Set loading for the table/overall operation
    try {
      // Step 1: Update Time Entry status in backend
      const timeEntryUpdateResponse = await fetch(`https://madebyquantbackend.onrender.com/time-entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!timeEntryUpdateResponse.ok) {
        const errorData = await timeEntryUpdateResponse.json().catch(() => ({ error: 'Unknown error.' }));
        throw new Error(errorData.error || `Failed to approve time entry: ${timeEntryUpdateResponse.status}`);
      }

      // Step 2: Update Employee's total hours in backend
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        throw new Error('Employee not found for hours update.');
      }

      const newHoursWorkedTotal = (employee.hours_worked_total ?? 0) + hoursWorked;

      // Note: Backend expects 'hoursWorked' (camelCase) for employee update
      const employeeUpdateResponse = await fetch(`https://madebyquantbackend.onrender.com/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hoursWorked: newHoursWorkedTotal })
      });

      if (!employeeUpdateResponse.ok) {
        const errorData = await employeeUpdateResponse.json().catch(() => ({ error: 'Unknown error.' }));
        throw new Error(errorData.error || `Failed to update employee hours: ${employeeUpdateResponse.status}`);
      }

      // Step 3: Refresh local state and parent's employee data
      await fetchTimeEntries(); // Re-fetch all time entries to get updated status
      await onEmployeeDataChange(); // Tell parent to re-fetch employees

      message.success('Time entry approved and employee hours updated!');
    } catch (error) {
      console.error('Error approving time entry:', error);
      message.error(`Failed to approve time entry: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectEntry = async (entryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://madebyquantbackend.onrender.com/time-entries/${entryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred.' }));
        throw new Error(errorData.error || `Failed to reject time entry: ${response.status}`);
      }

      setTimeEntries(prev => prev.filter(e => e.id !== entryId)); // Remove from local state
      message.info('Time entry rejected and removed.');
    } catch (error) {
      console.error('Error rejecting time entry:', error);
      message.error(`Failed to reject time entry: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeName = (employeeId: string) => { // Employee ID is string now
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_id', // Use employee_id
      key: 'employee',
      render: (employee_id: string) => getEmployeeName(employee_id)
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Hours Worked',
      dataIndex: 'hours_worked', // Use hours_worked
      key: 'hoursWorked',
      render: (hours: number) => `${hours}h`
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || 'No description'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'pending' | 'approved' | 'rejected' | null) => { // Allow status to be null
        const displayStatus = status || 'unknown'; // Default to 'unknown' if null/undefined
        let color: string;
        switch (displayStatus) {
          case 'approved':
            color = 'green';
            break;
          case 'pending':
            color = 'orange';
            break;
          case 'rejected':
            color = 'red';
            break;
          default:
            color = 'default'; // Or 'gray' for unknown
        }
        return (
          <Tag color={color}>
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: TimeEntry) => {
        // Handle null status gracefully for actions as well
        if (record.status === 'approved') {
          return <Tag color='green'>Approved</Tag>;
        }
        if (record.status === 'rejected') {
          return <Tag color='red'>Rejected</Tag>;
        }
        // If status is null or pending, show action buttons
        return (
          <Space>
            <Button
              type='primary'
              size='small'
              icon={<CheckOutlined />}
              onClick={() => handleApproveEntry(record.id, record.employee_id, record.hours_worked)}
              className='bg-green-500 hover:bg-green-600 border-0'
              loading={isLoading} // Disable if any action is ongoing
            >
              Approve
            </Button>
            <Button
              danger
              size='small'
              icon={<CloseOutlined />}
              onClick={() => handleRejectEntry(record.id)}
              loading={isLoading} // Disable if any action is ongoing
            >
              Reject
            </Button>
          </Space>
        );
      }
    }
  ];

  const pendingEntries = timeEntries.filter(entry => entry.status === 'pending').length;
  const totalHoursThisWeek = timeEntries
    .filter(entry => dayjs(entry.date).isAfter(dayjs().startOf('week')) && entry.status === 'approved') // Only count approved hours
    .reduce((sum, entry) => sum + entry.hours_worked, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <Card className='text-center shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100'>
          <div className='text-2xl font-bold text-blue-600'>
            {timeEntries.length}
          </div>
          <div className='text-gray-600'>Total Entries</div>
        </Card>
        <Card className='text-center shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100'>
          <div className='text-2xl font-bold text-orange-600'>
            {pendingEntries}
          </div>
          <div className='text-gray-600'>Pending Approval</div>
        </Card>
        <Card className='text-center shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100'>
          <div className='text-2xl font-bold text-green-600'>
            {totalHoursThisWeek}h
          </div>
          <div className='text-gray-600'>Hours This Week (Approved)</div>
        </Card>
      </div>

      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            Time Tracking Register
          </Space>
        }
        extra={
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields(); // Reset form when opening modal
              setIsModalVisible(true);
            }}
            className='bg-gradient-to-r from-blue-500 to-purple-600 border-0'
          >
            Add Time Entry
          </Button>
        }
        className='shadow-lg border-0'
        headStyle={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        <Table
          columns={columns}
          dataSource={timeEntries}
          rowKey='id'
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
          loading={isLoading}
        />
      </Card>

      <Modal
        title='Add Time Entry'
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        confirmLoading={isSubmitting} // Show loading on modal's primary button
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleAddTimeEntry}
          onFinishFailed={(errorInfo) => { // Enhanced onFinishFailed
            console.error("Form validation failed:", errorInfo); // Debugging log
            message.error("Please correct the form errors before submitting."); // More direct message
            setIsSubmitting(false); // Ensure loading state is reset on validation failure
          }}
          initialValues={{ date: dayjs() }}
        >
          <Form.Item
            name='employeeId' // Form field name (camelCase)
            label='Employee'
            rules={[{ required: true, message: 'Please select an employee' }]}
          >
            <Select placeholder='Select employee' loading={employees.length === 0 && isLoading}>
              {employees.map(employee => (
                <Option key={employee.id} value={employee.id}> {/* Use employee.id (string UUID) */}
                  {employee.name} - {employee.position}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name='date'
            label='Date'
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name='hoursWorked' // Form field name (camelCase)
            label='Hours Worked'
            rules={[
              { required: true, message: 'Please enter hours worked' },
              {
                type: 'number',
                min: 0.5,
                max: 24,
                message: 'Hours must be between 0.5 and 24'
              }
            ]}
          >
            <InputNumber
              min={0.5}
              max={24}
              step={0.5}
              style={{ width: '100%' }}
              placeholder='Enter hours worked'
            />
          </Form.Item>

          <Form.Item name='description' label='Description (Optional)'>
            <TextArea rows={3} placeholder='Enter work description...' />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type='primary' htmlType='submit' loading={isSubmitting}>
                Add Entry
              </Button>
              <Button onClick={() => setIsModalVisible(false)} disabled={isSubmitting}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default TimeTracking;

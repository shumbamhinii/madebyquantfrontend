import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
// Removed RadioGroup and RadioGroupItem as they are no longer needed for type/category filters
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '../components/ui/label';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Printer, FileText } from 'lucide-react';

// Define an interface for your transaction data
interface Transaction {
  id: string;
  type: string; // 'income' or 'expense'
  amount: number | string;
  description: string;
  date: string; // Stored as YYYY-MM-DD
  category: string | null;
  account_id: string | null;
  account_name: string | null;
  created_at: string;
}

// Interface for Account
interface Account {
  id: string;
  code: string;
  name: string;
  type: string; // e.g., 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense' - IMPORTANT for 'Revenue Accounts' filter
}

const Transactions = () => {
  // Removed selectedTypeFilter and selectedCategoryFilter
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all'); // State for account filter

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]); // To populate the account dropdown
  const [loading, setLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Removed categoryFilters and typeFilters arrays

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let queryParams = new URLSearchParams();

    // Account Filter Logic
    if (selectedAccountFilter !== 'all') {
      if (selectedAccountFilter === 'revenue_accounts') {
        // Special case: filter by account type 'Revenue'
        queryParams.append('accountType', 'Revenue');
      } else {
        // Filter by specific account ID
        queryParams.append('accountId', selectedAccountFilter);
      }
    }

    if (searchTerm) {
      queryParams.append('search', searchTerm);
    }
    if (fromDate) {
      queryParams.append('fromDate', fromDate);
    }
    if (toDate) {
      queryParams.append('toDate', toDate);
    }

    try {
      const response = await fetch(`http://localhost:3000/transactions?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountFilter, searchTerm, fromDate, toDate]); // Dependencies updated

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch accounts only once on mount
  useEffect(() => {
    fetch('http://localhost:3000/accounts')
      .then(res => res.json())
      .then(data => setAccounts(data))
      .catch(console.error);
  }, []);

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date,
      category: transaction.category,
      account_id: transaction.account_id,
    });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    const finalValue = value === "NULL_CATEGORY_PLACEHOLDER" || value === "NO_ACCOUNT_PLACEHOLDER" ? null : value;
    setEditFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleUpdateSubmit = async () => {
    if (!editingTransaction) return;

    const parsedAmount = parseFloat(editFormData.amount);
    if (isNaN(parsedAmount) || !editFormData.type || !editFormData.date) {
      alert('Please fill in all required fields (Type, Amount, Date).');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/transactions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          type: editFormData.type,
          amount: parsedAmount,
          description: editFormData.description || null,
          date: editFormData.date,
          category: editFormData.category || null,
          account_id: editFormData.account_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      fetchTransactions();
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      setEditFormData({});

    } catch (error) {
      console.error('Error updating transaction:', error);
      alert(`Failed to update transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'ID',
      'Type',
      'Amount',
      'Description',
      'Date',
      'Category',
      'Account Name',
      'Created At',
    ];

    const csvRows = transactions.map(t => [
      `"${t.id}"`,
      `"${t.type}"`,
      `${(+t.amount).toFixed(2)}`,
      `"${t.description ? t.description.replace(/"/g, '""') : ''}"`,
      `"${new Date(t.date).toLocaleDateString()}"`,
      `"${t.category || ''}"`,
      `"${t.account_name || ''}"`,
      `"${new Date(t.created_at).toLocaleString()}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className='flex-1 space-y-4 p-4 md:p-6 lg:p-8'>
      <Header title='Transactions' />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className='space-y-6'
      >
        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Filters</CardTitle>
            {/* Updated description */}
            <CardDescription>Filter transactions by account and date range</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Removed Transaction Type Filter */}
            {/* Removed Transaction Category Filter */}

            {/* Account Filter */}
            <div>
                <Label className='mb-2 block font-medium'>Filter by Account</Label>
                <Select
                    value={selectedAccountFilter}
                    onValueChange={setSelectedAccountFilter}
                >
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {/* Add the "Revenue Accounts" filter option */}
                        <SelectItem value="revenue_accounts">Revenue Accounts</SelectItem>
                        {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>

        {/* Search and Date Range Filters */}
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
          <div className='flex flex-col sm:flex-row gap-4 flex-1'>
            <Input
              placeholder='Search description, type, account...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='max-w-sm'
            />
            <div className='flex gap-2'>
              <Input
                type='date'
                placeholder='From date'
                className='max-w-40'
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
              <Input
                type='date'
                placeholder='To date'
                className='max-w-40'
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={handleExportCsv}>
              <FileText className='h-4 w-4 mr-2' /> Export CSV
            </Button>
            <Button onClick={handlePrint}>
              <Printer className='h-4 w-4 mr-2' /> Print
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left p-3'>Transaction Type</th>
                    <th className='text-left p-3'>Description</th>
                    <th className='text-left p-3'>Date</th>
                    <th className='text-left p-3'>Account</th>
                    <th className='text-left p-3'>Category</th>
                    <th className='text-left p-3'>Amount</th>
                    <th className='text-left p-3'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className='text-center py-12 text-muted-foreground'>
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='text-center py-12 text-muted-foreground'>
                        No transactions found for the selected criteria
                      </td>
                    </tr>
                  ) : (
                    transactions.map(transaction => (
                      <tr key={transaction.id} className='border-b last:border-b-0 hover:bg-muted/50'>
                        <td className='p-3'>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className='p-3'>{transaction.description || '-'}</td>
                        <td className='p-3'>{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className='p-3'>{transaction.account_name || 'N/A'}</td>
                        <td className='p-3'>{transaction.category || '-'}</td>
                        <td className='p-3'>R{(+transaction.amount).toFixed(2)}</td>
                        <td className='p-3'>
                          <div className='flex gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleEditClick(transaction)}
                            >
                              <Edit className='h-4 w-4' />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className='space-y-4 py-4'>
              <Label htmlFor='edit-type'>Transaction Type</Label>
              <Select
                name='type'
                value={editFormData.type || ''}
                onValueChange={value => handleEditSelectChange('type', value)}
              >
                <SelectTrigger id='edit-type'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='income'>Income</SelectItem>
                  <SelectItem value='expense'>Expense</SelectItem>
                </SelectContent>
              </Select>

              <Label htmlFor='edit-amount'>Amount (R)</Label>
              <Input
                id='edit-amount'
                type='number'
                name='amount'
                value={editFormData.amount}
                onChange={handleEditFormChange}
                placeholder='Amount'
              />

              <Label htmlFor='edit-date'>Date</Label>
              <Input
                id='edit-date'
                type='date'
                name='date'
                value={editFormData.date}
                onChange={handleEditFormChange}
              />

              <Label htmlFor='edit-description'>Description</Label>
              <Input
                id='edit-description'
                type='text'
                name='description'
                value={editFormData.description}
                onChange={handleEditFormChange}
                placeholder='Description'
              />

              <Label htmlFor='edit-category'>Category</Label>
              <Select
                name='category'
                value={editFormData.category || "NULL_CATEGORY_PLACEHOLDER"}
                onValueChange={value => handleEditSelectChange('category', value)}
              >
                <SelectTrigger id='edit-category'>
                  <SelectValue placeholder='Select category (Optional)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NULL_CATEGORY_PLACEHOLDER">None</SelectItem>
                  <SelectItem value='Trading Income'>Trading Income</SelectItem>
                  <SelectItem value='COG / Direct Costs'>COG / Direct Costs</SelectItem>
                  <SelectItem value='Non-Trading Income'>Non-Trading Income</SelectItem>
                  <SelectItem value='Business Expenses'>Business Expenses</SelectItem>
                </SelectContent>
              </Select>

              <Label htmlFor='edit-account'>Account</Label>
              <Select
                name='account_id'
                value={editFormData.account_id || "NO_ACCOUNT_PLACEHOLDER"}
                onValueChange={value => handleEditSelectChange('account_id', value)}
              >
                <SelectTrigger id='edit-account'>
                  <SelectValue placeholder='Select account' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_ACCOUNT_PLACEHOLDER">No Account</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='outline' onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSubmit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
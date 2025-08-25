import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Transaction, CreateTransactionInput, Category, Vendor, Pool, TransactionType } from '../../../server/src/schema';

interface TransactionManagerProps {
  userId: number;
}

export function TransactionManager({ userId }: TransactionManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: userId,
    pool_id: null,
    type: 'expense',
    amount: 0,
    description: '',
    category_id: null,
    vendor_id: null,
    associated_person: null,
    transaction_date: new Date()
  });

  const [filter, setFilter] = useState<{
    type?: TransactionType;
    pool_id?: number;
    category_id?: number;
    vendor_id?: number;
  }>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'credit': return '🤝';
      case 'payment': return '💳';
      default: return '📝';
    }
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'credit': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [transactionsResult, categoriesResult, vendorsResult, poolsResult] = await Promise.all([
        trpc.getTransactions.query({ user_id: userId, ...filter }),
        trpc.getUserCategories.query({ userId }),
        trpc.getUserVendors.query({ userId }),
        trpc.getUserPools.query({ userId })
      ]);
      
      setTransactions(transactionsResult);
      setCategories(categoriesResult);
      setVendors(vendorsResult);
      setPools(poolsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [userId, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newTransaction = await trpc.createTransaction.mutate(formData);
      setTransactions((prev: Transaction[]) => [newTransaction, ...prev]);
      setFormData({
        user_id: userId,
        pool_id: null,
        type: 'expense',
        amount: 0,
        description: '',
        category_id: null,
        vendor_id: null,
        associated_person: null,
        transaction_date: new Date()
      });
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate({ transactionId });
      setTransactions((prev: Transaction[]) => 
        prev.filter((t: Transaction) => t.id !== transactionId)
      );
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return '';
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.name : '';
  };

  const getVendorName = (vendorId: number | null) => {
    if (!vendorId) return '';
    const vendor = vendors.find((v: Vendor) => v.id === vendorId);
    return vendor ? vendor.name : '';
  };

  const getPoolName = (poolId: number | null) => {
    if (!poolId) return '';
    const pool = pools.find((p: Pool) => p.id === poolId);
    return pool ? pool.name : '';
  };

  const filteredCategories = categories.filter((cat: Category) => 
    formData.type === 'income' || formData.type === 'expense' || formData.type === 'credit'
  ).filter((cat: Category) => cat.type === formData.type);

  return (
    <div className="space-y-6">
      {/* Create Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Add New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="type">Transaction Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: TransactionType) => 
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      type: value,
                      category_id: null,
                      vendor_id: null,
                      associated_person: null 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">💰 Income</SelectItem>
                    <SelectItem value="expense">💸 Expense</SelectItem>
                    <SelectItem value="credit">🤝 Credit</SelectItem>
                    <SelectItem value="payment">💳 Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="transaction_date">Date</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      transaction_date: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="pool">Pool (Optional)</Label>
                <Select 
                  value={formData.pool_id?.toString() || ''} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      pool_id: value ? parseInt(value) : null 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Pool</SelectItem>
                    {pools.filter((p: Pool) => p.type === formData.type).map((pool: Pool) => (
                      <SelectItem key={pool.id} value={pool.id.toString()}>
                        {pool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.type === 'income' || formData.type === 'expense' || formData.type === 'credit') && (
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id?.toString() || ''} 
                    onValueChange={(value: string) => 
                      setFormData((prev: CreateTransactionInput) => ({ 
                        ...prev, 
                        category_id: value ? parseInt(value) : null 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Category</SelectItem>
                      {filteredCategories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'payment' && (
                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <Select 
                    value={formData.vendor_id?.toString() || ''} 
                    onValueChange={(value: string) => 
                      setFormData((prev: CreateTransactionInput) => ({ 
                        ...prev, 
                        vendor_id: value ? parseInt(value) : null 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Vendor</SelectItem>
                      {vendors.map((vendor: Vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'credit' && (
                <div>
                  <Label htmlFor="associated_person">Associated Person</Label>
                  <Input
                    id="associated_person"
                    placeholder="Who owes or is owed?"
                    value={formData.associated_person || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateTransactionInput) => ({ 
                        ...prev, 
                        associated_person: e.target.value || null 
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter transaction details..."
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateTransactionInput) => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))
                }
                required
              />
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? '✨ Creating...' : '💾 Add Transaction'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Type</Label>
              <Select 
                value={filter.type || ''} 
                onValueChange={(value: string) => 
                  setFilter((prev) => ({ ...prev, type: value as TransactionType || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="income">💰 Income</SelectItem>
                  <SelectItem value="expense">💸 Expense</SelectItem>
                  <SelectItem value="credit">🤝 Credit</SelectItem>
                  <SelectItem value="payment">💳 Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pool</Label>
              <Select 
                value={filter.pool_id?.toString() || ''} 
                onValueChange={(value: string) => 
                  setFilter((prev) => ({ ...prev, pool_id: value ? parseInt(value) : undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All pools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Pools</SelectItem>
                  {pools.map((pool: Pool) => (
                    <SelectItem key={pool.id} value={pool.id.toString()}>
                      {pool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={filter.category_id?.toString() || ''} 
                onValueChange={(value: string) => 
                  setFilter((prev) => ({ ...prev, category_id: value ? parseInt(value) : undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vendor</Label>
              <Select 
                value={filter.vendor_id?.toString() || ''} 
                onValueChange={(value: string) => 
                  setFilter((prev) => ({ ...prev, vendor_id: value ? parseInt(value) : undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Vendors</SelectItem>
                  {vendors.map((vendor: Vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => setFilter({})}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 Recent Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transactions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No transactions found. Create your first transaction above! 🚀
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">{getTransactionIcon(transaction.type)}</span>
                        <Badge className={getTransactionColor(transaction.type)}>
                          {transaction.type.toUpperCase()}
                        </Badge>
                        <span className="text-lg font-semibold">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{transaction.description}</p>
                      
                      <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                        <span>📅 {transaction.transaction_date.toLocaleDateString()}</span>
                        
                        {transaction.pool_id && (
                          <span>🏊‍♂️ {getPoolName(transaction.pool_id)}</span>
                        )}
                        
                        {transaction.category_id && (
                          <span>📂 {getCategoryName(transaction.category_id)}</span>
                        )}
                        
                        {transaction.vendor_id && (
                          <span>🏪 {getVendorName(transaction.vendor_id)}</span>
                        )}
                        
                        {transaction.associated_person && (
                          <span>👤 {transaction.associated_person}</span>
                        )}
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this transaction? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(transaction.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
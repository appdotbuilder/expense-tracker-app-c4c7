import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Pool, CreatePoolInput, PoolType } from '../../../server/src/schema';

interface PoolManagerProps {
  userId: number;
}

export function PoolManager({ userId }: PoolManagerProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreatePoolInput>({
    user_id: userId,
    name: '',
    type: 'expense',
    description: null
  });

  const getPoolIcon = (type: PoolType) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'credit': return '🤝';
      case 'payment': return '💳';
      default: return '🏊‍♂️';
    }
  };

  const getPoolColor = (type: PoolType) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'credit': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadPools = useCallback(async () => {
    try {
      const result = await trpc.getUserPools.query({ userId });
      setPools(result);
    } catch (error) {
      console.error('Failed to load pools:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newPool = await trpc.createPool.mutate(formData);
      setPools((prev: Pool[]) => [...prev, newPool]);
      setFormData({
        user_id: userId,
        name: '',
        type: 'expense',
        description: null
      });
    } catch (error) {
      console.error('Failed to create pool:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const groupedPools = pools.reduce((acc, pool) => {
    if (!acc[pool.type]) {
      acc[pool.type] = [];
    }
    acc[pool.type].push(pool);
    return acc;
  }, {} as Record<string, Pool[]>);

  return (
    <div className="space-y-6">
      {/* Create Pool Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Create New Pool</CardTitle>
          <CardDescription>
            Group related transactions together (e.g., "Household Bills", "Side Income", "Travel Expenses")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Pool Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Household Bills, Side Income"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreatePoolInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Pool Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: PoolType) => 
                    setFormData((prev: CreatePoolInput) => ({ 
                      ...prev, 
                      type: value 
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
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this pool is for..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreatePoolInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? '✨ Creating...' : '🏊‍♂️ Create Pool'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {['income', 'expense', 'credit', 'payment'].map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <span>{getPoolIcon(type as PoolType)}</span>
                <span>{type.charAt(0).toUpperCase() + type.slice(1)} Pools</span>
              </CardTitle>
              <CardDescription>
                {groupedPools[type]?.length || 0} pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!groupedPools[type] || groupedPools[type].length === 0) ? (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-2xl mb-2">{getPoolIcon(type as PoolType)}</div>
                  <p className="text-sm">No {type} pools yet</p>
                  <p className="text-xs">Create one above! 🚀</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedPools[type].map((pool: Pool) => (
                    <div 
                      key={pool.id} 
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getPoolIcon(pool.type)}</span>
                          <h3 className="font-semibold text-gray-800">{pool.name}</h3>
                        </div>
                        <Badge className={getPoolColor(pool.type)}>
                          {pool.type}
                        </Badge>
                      </div>
                      
                      {pool.description && (
                        <p className="text-gray-600 text-sm mb-3">
                          {pool.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-500 flex items-center space-x-4">
                        <span>📅 Created {pool.created_at.toLocaleDateString()}</span>
                        <span>🆔 ID: {pool.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pool Examples */}
      {pools.length === 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg">💡 Pool Ideas</CardTitle>
            <CardDescription>
              Here are some examples to get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">💰 Income Pools</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Primary Salary</li>
                  <li>• Side Income</li>
                  <li>• Investments & Returns</li>
                  <li>• Freelancing Income</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-red-700 mb-2">💸 Expense Pools</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Household Bills</li>
                  <li>• Groceries & Food</li>
                  <li>• Travel & Transport</li>
                  <li>• Entertainment</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">🤝 Credit Pools</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Personal Loans</li>
                  <li>• Friend Borrowings</li>
                  <li>• Family Credits</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">💳 Payment Pools</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Online Shopping</li>
                  <li>• Utility Payments</li>
                  <li>• Subscription Services</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {pools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Pool Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {groupedPools.income?.length || 0}
                </div>
                <div className="text-sm text-green-700">Income Pools</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {groupedPools.expense?.length || 0}
                </div>
                <div className="text-sm text-red-700">Expense Pools</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {groupedPools.credit?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Credit Pools</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {groupedPools.payment?.length || 0}
                </div>
                <div className="text-sm text-purple-700">Payment Pools</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Budget, CreateBudgetInput, Pool } from '../../../server/src/schema';

interface BudgetManagerProps {
  userId: number;
}

export function BudgetManager({ userId }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateBudgetInput>({
    pool_id: 0,
    target_amount: 0,
    period_start: new Date(),
    period_end: new Date()
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const loadData = useCallback(async () => {
    try {
      const poolsResult = await trpc.getUserPools.query({ userId });
      setPools(poolsResult);
      
      // Load budgets for all pools
      const allBudgets: Budget[] = [];
      for (const pool of poolsResult) {
        try {
          const poolBudgets = await trpc.getPoolBudgets.query({ poolId: pool.id });
          allBudgets.push(...poolBudgets);
        } catch (error) {
          console.error(`Failed to load budgets for pool ${pool.id}:`, error);
        }
      }
      setBudgets(allBudgets);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newBudget = await trpc.createBudget.mutate(formData);
      setBudgets((prev: Budget[]) => [...prev, newBudget]);
      setFormData({
        pool_id: 0,
        target_amount: 0,
        period_start: new Date(),
        period_end: new Date()
      });
    } catch (error) {
      console.error('Failed to create budget:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getPoolName = (poolId: number) => {
    const pool = pools.find((p: Pool) => p.id === poolId);
    return pool ? pool.name : 'Unknown Pool';
  };

  const getPoolType = (poolId: number) => {
    const pool = pools.find((p: Pool) => p.id === poolId);
    return pool ? pool.type : 'unknown';
  };

  const getPoolIcon = (poolId: number) => {
    const type = getPoolType(poolId);
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'credit': return '🤝';
      case 'payment': return '💳';
      default: return '🏊‍♂️';
    }
  };

  const getBudgetStatus = (budget: Budget) => {
    const now = new Date();
    const start = budget.period_start;
    const end = budget.period_end;
    
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
  };

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Set default end date to 30 days from start date when start date changes
  const handleStartDateChange = (dateStr: string) => {
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);
    
    setFormData((prev: CreateBudgetInput) => ({
      ...prev,
      period_start: startDate,
      period_end: endDate
    }));
  };

  return (
    <div className="space-y-6">
      {/* Create Budget Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Create New Budget</CardTitle>
          <CardDescription>
            Set spending or income targets for your pools and track your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pool_id">Select Pool</Label>
                <Select 
                  value={formData.pool_id.toString()} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateBudgetInput) => ({ 
                      ...prev, 
                      pool_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((pool: Pool) => (
                      <SelectItem key={pool.id} value={pool.id.toString()}>
                        {getPoolIcon(pool.id)} {pool.name} ({pool.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_amount">Target Amount (₹)</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.target_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateBudgetInput) => ({ 
                      ...prev, 
                      target_amount: parseFloat(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="period_start">Start Date</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleStartDateChange(e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="period_end">End Date</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateBudgetInput) => ({ 
                      ...prev, 
                      period_end: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isCreating || formData.pool_id === 0} className="w-full">
              {isCreating ? '✨ Creating...' : '📊 Create Budget'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Budgets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Your Budgets</CardTitle>
          <CardDescription>
            {budgets.length} budgets tracking your financial goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-lg mb-2">No budgets yet</p>
              <p className="text-sm">Create your first budget above to start tracking your financial goals! 🎯</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget: Budget) => {
                const status = getBudgetStatus(budget);
                const daysRemaining = getDaysRemaining(budget.period_end);
                
                return (
                  <div 
                    key={budget.id} 
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getPoolIcon(budget.pool_id)}</span>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800">
                            {getPoolName(budget.pool_id)}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Target: {formatCurrency(budget.target_amount)}
                          </p>
                        </div>
                      </div>
                      <Badge className={getBudgetStatusColor(status)}>
                        {status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Progress Bar - Placeholder for now */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress (Mock Data)</span>
                        <span>60% of target</span>
                      </div>
                      <Progress value={60} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{formatCurrency(budget.target_amount * 0.6)} spent</span>
                        <span>{formatCurrency(budget.target_amount)} target</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <div className="font-medium">{budget.period_start.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <div className="font-medium">{budget.period_end.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Days Left:</span>
                        <div className="font-medium">
                          {status === 'completed' ? 'Ended' : 
                           status === 'upcoming' ? 'Not started' :
                           daysRemaining > 0 ? `${daysRemaining} days` : 'Last day!'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="font-medium">{budget.created_at.toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Tips */}
      {budgets.length === 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-lg">💡 Budget Tips</CardTitle>
            <CardDescription>
              Make the most of your budget tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-orange-700 mb-2">🎯 Setting Goals</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Set realistic monthly targets</li>
                  <li>• Track both income and expenses</li>
                  <li>• Review and adjust regularly</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-yellow-700 mb-2">📈 Best Practices</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use pools to organize budgets</li>
                  <li>• Set alerts for overspending</li>
                  <li>• Plan for unexpected expenses</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📈 Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {budgets.filter((b: Budget) => getBudgetStatus(b) === 'active').length}
                </div>
                <div className="text-sm text-green-700">Active Budgets</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {budgets.filter((b: Budget) => getBudgetStatus(b) === 'upcoming').length}
                </div>
                <div className="text-sm text-blue-700">Upcoming Budgets</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {formatCurrency(budgets.reduce((sum: number, b: Budget) => sum + b.target_amount, 0))}
                </div>
                <div className="text-sm text-gray-700">Total Targets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
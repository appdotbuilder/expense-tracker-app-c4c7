import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';

interface ReportsViewProps {
  userId: number;
}

// Import the actual return types from server handlers
interface MonthlyReportData {
  totalIncome: number;
  totalExpenses: number;
  totalCredit: number;
  totalPayments: number;
  netAmount: number;
  transactionCount: number;
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    type: 'income' | 'expense' | 'credit';
    totalAmount: number;
    transactionCount: number;
  }>;
  poolBreakdown: Array<{
    poolId: number;
    poolName: string;
    type: 'income' | 'expense' | 'credit' | 'payment';
    totalAmount: number;
    transactionCount: number;
  }>;
}

interface CategoryReportData {
  categories: Array<{
    categoryId: number;
    categoryName: string;
    type: 'income' | 'expense' | 'credit';
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    monthlyBreakdown: Array<{
      year: number;
      month: number;
      totalAmount: number;
      transactionCount: number;
    }>;
  }>;
  totalsByType: {
    income: number;
    expense: number;
    credit: number;
  };
}

export function ReportsView({ userId }: ReportsViewProps) {
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportData | null>(null);
  const [categoryReport, setCategoryReport] = useState<CategoryReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Monthly report filters
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  
  // Category report filters
  const [categoryStartDate, setCategoryStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [categoryEndDate, setCategoryEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const loadMonthlyReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getMonthlyReport.query({
        user_id: userId,
        year: monthlyYear,
        month: monthlyMonth
      });
      setMonthlyReport(result);
    } catch (error) {
      console.error('Failed to load monthly report:', error);
      setMonthlyReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, monthlyYear, monthlyMonth]);

  const loadCategoryReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getCategoryReport.query({
        user_id: userId,
        start_date: new Date(categoryStartDate),
        end_date: new Date(categoryEndDate)
      });
      setCategoryReport(result);
    } catch (error) {
      console.error('Failed to load category report:', error);
      setCategoryReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, categoryStartDate, categoryEndDate]);

  useEffect(() => {
    loadMonthlyReport();
  }, [loadMonthlyReport]);

  useEffect(() => {
    loadCategoryReport();
  }, [loadCategoryReport]);

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'credit': return '🤝';
      default: return '📂';
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'credit': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="monthly" className="flex items-center space-x-2">
            <span>📅</span>
            <span>Monthly Report</span>
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center space-x-2">
            <span>📂</span>
            <span>Category Report</span>
          </TabsTrigger>
        </TabsList>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📅 Monthly Financial Report</CardTitle>
              <CardDescription>
                Complete breakdown of your finances for a specific month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select 
                    value={monthlyYear.toString()} 
                    onValueChange={(value: string) => setMonthlyYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select 
                    value={monthlyMonth.toString()} 
                    onValueChange={(value: string) => setMonthlyMonth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {getMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={loadMonthlyReport} disabled={isLoading} className="w-full">
                    {isLoading ? '📊 Loading...' : '📊 Generate Report'}
                  </Button>
                </div>
              </div>

              {/* Report Display */}
              {monthlyReport ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {getMonthName(monthlyMonth)} {monthlyYear}
                    </h3>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl mb-1">💰</div>
                      <div className="text-lg font-semibold text-green-700">
                        {formatCurrency(monthlyReport.totalIncome)}
                      </div>
                      <div className="text-sm text-green-600">Total Income</div>
                    </div>
                    
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <div className="text-2xl mb-1">💸</div>
                      <div className="text-lg font-semibold text-red-700">
                        {formatCurrency(monthlyReport.totalExpenses)}
                      </div>
                      <div className="text-sm text-red-600">Total Expenses</div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl mb-1">🤝</div>
                      <div className="text-lg font-semibold text-blue-700">
                        {formatCurrency(monthlyReport.totalCredit)}
                      </div>
                      <div className="text-sm text-blue-600">Credits</div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <div className="text-lg font-semibold text-purple-700">
                        {formatCurrency(monthlyReport.totalPayments)}
                      </div>
                      <div className="text-sm text-purple-600">Payments</div>
                    </div>
                  </div>

                  {/* Net Summary */}
                  <Card className={`${monthlyReport.netAmount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl mb-2">
                        {monthlyReport.netAmount >= 0 ? '📈' : '📉'}
                      </div>
                      <div className={`text-2xl font-bold ${monthlyReport.netAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(Math.abs(monthlyReport.netAmount))}
                      </div>
                      <div className={`text-lg ${monthlyReport.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Net {monthlyReport.netAmount >= 0 ? 'Surplus' : 'Deficit'}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {monthlyReport.netAmount >= 0 
                          ? 'Great! You saved money this month 🎉'
                          : 'You spent more than you earned this month'
                        }
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        Total transactions: {monthlyReport.transactionCount}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  {monthlyReport.categoryBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">📂 Category Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {monthlyReport.categoryBreakdown.map((category) => (
                            <div key={category.categoryId} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <span>{getCategoryIcon(category.type)}</span>
                                <span className="font-medium">{category.categoryName}</span>
                              </div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(category.totalAmount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {category.transactionCount} transactions
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pool Breakdown */}
                  {monthlyReport.poolBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">🏊‍♂️ Pool Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {monthlyReport.poolBreakdown.map((pool) => (
                            <div key={pool.poolId} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <span>{getCategoryIcon(pool.type)}</span>
                                <span className="font-medium">{pool.poolName}</span>
                              </div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(pool.totalAmount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {pool.transactionCount} transactions
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-lg mb-2">No data available</p>
                  <p className="text-sm">Try selecting a different month or add some transactions first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Report */}
        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📂 Category Breakdown</CardTitle>
              <CardDescription>
                Detailed spending and earning patterns by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={categoryStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryStartDate(e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={categoryEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryEndDate(e.target.value)
                    }
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={loadCategoryReport} disabled={isLoading} className="w-full">
                    {isLoading ? '📂 Loading...' : '📂 Generate Report'}
                  </Button>
                </div>
              </div>

              {/* Report Display */}
              {categoryReport && categoryReport.categories.length > 0 ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Category Report ({new Date(categoryStartDate).toLocaleDateString()} - {new Date(categoryEndDate).toLocaleDateString()})
                    </h3>
                  </div>

                  {/* Summary by Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📊 Summary by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['income', 'expense', 'credit'].map(type => {
                          const total = categoryReport.totalsByType[type as keyof typeof categoryReport.totalsByType];
                          const typeCategories = categoryReport.categories.filter(cat => cat.type === type);
                          const count = typeCategories.reduce((sum, cat) => sum + cat.transactionCount, 0);
                          
                          return (
                            <div key={type} className={`p-4 rounded-lg text-center ${getCategoryColor(type).replace('text-', 'bg-').replace('-800', '-50')}`}>
                              <div className="text-2xl mb-1">{getCategoryIcon(type)}</div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(total)}
                              </div>
                              <div className="text-sm opacity-75">
                                {count} transactions in {typeCategories.length} categories
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryReport.categories.map((category) => (
                      <Card key={category.categoryId} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getCategoryIcon(category.type)}</span>
                              <div>
                                <h4 className="font-semibold text-gray-800">
                                  {category.categoryName}
                                </h4>
                                <Badge className={getCategoryColor(category.type)}>
                                  {category.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800 mb-1">
                              {formatCurrency(category.totalAmount)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {category.transactionCount} transactions
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Avg: {formatCurrency(category.averageAmount)}
                            </div>
                          </div>

                          {/* Monthly Breakdown */}
                          {category.monthlyBreakdown.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-gray-600 mb-2">Monthly Breakdown:</div>
                              <div className="space-y-1">
                                {category.monthlyBreakdown.slice(-3).map((month) => (
                                  <div key={`${month.year}-${month.month}`} className="flex justify-between text-xs">
                                    <span>{getMonthName(month.month)} {month.year}</span>
                                    <span>{formatCurrency(month.totalAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">📂</div>
                  <p className="text-lg mb-2">No category data available</p>
                  <p className="text-sm">Try adjusting the date range or add some categorized transactions first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
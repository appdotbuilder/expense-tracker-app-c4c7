import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { TransactionManager } from '@/components/TransactionManager';
import { CategoryManager } from '@/components/CategoryManager';
import { VendorManager } from '@/components/VendorManager';
import { PoolManager } from '@/components/PoolManager';
import { BudgetManager } from '@/components/BudgetManager';
import { ReportsView } from '@/components/ReportsView';
import type { User, CreateUserInput } from '../../server/src/schema';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState<CreateUserInput>({
    email: '',
    name: ''
  });

  // Load users on component mount (stub for now - in real app would fetch from API)
  const loadUsers = useCallback(async () => {
    // STUB: In a real application, you would have a getUsers API endpoint
    // For now, we'll create a sample user if none exists
    console.log('Loading users - stub implementation');
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const newUser = await trpc.createUser.mutate(newUserData);
      setUsers((prev: User[]) => [...prev, newUser]);
      setCurrentUser(newUser);
      setNewUserData({ email: '', name: '' });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // User selection/creation interface
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto mt-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-indigo-700">💰 ExpenseTracker</CardTitle>
              <CardDescription>
                Your personal finance companion for tracking income, expenses, and more!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {users.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Select User</Label>
                  <div className="mt-2 space-y-2">
                    {users.map((user: User) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setCurrentUser(user)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Create New User</Label>
                    <Input
                      id="name"
                      placeholder="Full Name"
                      value={newUserData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={newUserData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatingUser}>
                    {isCreatingUser ? '✨ Creating Account...' : '🚀 Start Tracking'}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main application interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-indigo-700">💰 ExpenseTracker</h1>
              <Badge variant="secondary" className="px-3 py-1">
                Welcome back, {currentUser.name}! 👋
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentUser(null)}
              className="text-gray-600"
            >
              Switch User 🔄
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="bg-white rounded-lg shadow-md p-1 flex-wrap gap-1">
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <span>💳</span>
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="pools" className="flex items-center space-x-2">
              <span>🏊‍♂️</span>
              <span>Pools</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center space-x-2">
              <span>📊</span>
              <span>Budgets</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center space-x-2">
              <span>📂</span>
              <span>Categories</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center space-x-2">
              <span>🏪</span>
              <span>Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <span>📈</span>
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💳</span>
                  <span>Transaction Management</span>
                </CardTitle>
                <CardDescription>
                  Track your income, expenses, credits, and payments all in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionManager userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🏊‍♂️</span>
                  <span>Pool Management</span>
                </CardTitle>
                <CardDescription>
                  Create and manage pools to group related transactions (e.g., Household Bills, Side Income)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PoolManager userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Budget Tracking</span>
                </CardTitle>
                <CardDescription>
                  Set spending and income targets for your pools and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetManager userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📂</span>
                  <span>Category Management</span>
                </CardTitle>
                <CardDescription>
                  Organize your income, expenses, and credits with custom categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryManager userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🏪</span>
                  <span>Vendor Management</span>
                </CardTitle>
                <CardDescription>
                  Manage vendors for your payment transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VendorManager userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📈</span>
                  <span>Financial Reports</span>
                </CardTitle>
                <CardDescription>
                  View detailed reports and analytics for your financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsView userId={currentUser.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
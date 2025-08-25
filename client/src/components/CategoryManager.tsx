import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Category, CreateCategoryInput } from '../../../server/src/schema';

interface CategoryManagerProps {
  userId: number;
}

export function CategoryManager({ userId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateCategoryInput>({
    user_id: userId,
    name: '',
    type: 'expense'
  });

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

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getUserCategories.query({ userId });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newCategory = await trpc.createCategory.mutate(formData);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setFormData({
        user_id: userId,
        name: '',
        type: 'expense'
      });
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const groupedCategories = categories.reduce((acc, category) => {
    if (!acc[category.type]) {
      acc[category.type] = [];
    }
    acc[category.type].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="space-y-6">
      {/* Create Category Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Create New Category</CardTitle>
          <CardDescription>
            Organize your transactions with custom categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Groceries, Salary, Loans"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCategoryInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Category Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'income' | 'expense' | 'credit') => 
                    setFormData((prev: CreateCategoryInput) => ({ 
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? '✨ Creating...' : '💾 Create Category'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['income', 'expense', 'credit'].map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <span>{getCategoryIcon(type)}</span>
                <span>{type.charAt(0).toUpperCase() + type.slice(1)} Categories</span>
              </CardTitle>
              <CardDescription>
                {groupedCategories[type]?.length || 0} categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!groupedCategories[type] || groupedCategories[type].length === 0) ? (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">No {type} categories yet</p>
                  <p className="text-xs">Create one above! 🚀</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedCategories[type].map((category: Category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center space-x-3">
                        <span>{getCategoryIcon(category.type)}</span>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-gray-500">
                            Created {category.created_at.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(category.type)}>
                        {category.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Category Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {groupedCategories.income?.length || 0}
                </div>
                <div className="text-sm text-green-700">Income Categories</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {groupedCategories.expense?.length || 0}
                </div>
                <div className="text-sm text-red-700">Expense Categories</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {groupedCategories.credit?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Credit Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Vendor, CreateVendorInput } from '../../../server/src/schema';

interface VendorManagerProps {
  userId: number;
}

export function VendorManager({ userId }: VendorManagerProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateVendorInput>({
    user_id: userId,
    name: '',
    description: null
  });

  const loadVendors = useCallback(async () => {
    try {
      const result = await trpc.getUserVendors.query({ userId });
      setVendors(result);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newVendor = await trpc.createVendor.mutate(formData);
      setVendors((prev: Vendor[]) => [...prev, newVendor]);
      setFormData({
        user_id: userId,
        name: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create vendor:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Vendor Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Add New Vendor</CardTitle>
          <CardDescription>
            Add vendors for your payment transactions (e.g., grocery stores, utilities, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Vendor Name</Label>
              <Input
                id="name"
                placeholder="e.g., BigBasket, BSNL, Local Grocery Store"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateVendorInput) => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this vendor..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVendorInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? '✨ Adding...' : '🏪 Add Vendor'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏪 Your Vendors</CardTitle>
          <CardDescription>
            {vendors.length} vendors available for payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-4">🏪</div>
              <p className="text-lg mb-2">No vendors yet</p>
              <p className="text-sm">Add your first vendor above to get started with payment tracking! 🚀</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor: Vendor) => (
                <div 
                  key={vendor.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-pink-50"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">🏪</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-purple-800 mb-1">
                        {vendor.name}
                      </h3>
                      
                      {vendor.description && (
                        <p className="text-gray-600 text-sm mb-3">
                          {vendor.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center space-x-1">
                          <span>📅</span>
                          <span>Added {vendor.created_at.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>🆔</span>
                          <span>ID: {vendor.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {vendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Vendor Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {vendors.length}
                </div>
                <div className="text-sm text-purple-700">Total Vendors</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">
                  {vendors.filter((v: Vendor) => v.description).length}
                </div>
                <div className="text-sm text-pink-700">With Descriptions</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {vendors.filter((v: Vendor) => {
                    const daysSinceCreated = Math.floor(
                      (new Date().getTime() - v.created_at.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return daysSinceCreated <= 7;
                  }).length}
                </div>
                <div className="text-sm text-indigo-700">Added This Week</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
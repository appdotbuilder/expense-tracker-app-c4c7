import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type GetCategoryReportQuery } from '../schema';
import { eq, and, gte, lte, isNotNull, desc, inArray } from 'drizzle-orm';
import { type SQL } from 'drizzle-orm';

// Category report data structure
export interface CategoryReportData {
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

export const getCategoryReport = async (query: GetCategoryReportQuery): Promise<CategoryReportData> => {
    try {
        // Build base query with user filter
        let transactionQuery = db.select()
            .from(transactionsTable)
            .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id));

        // Build conditions array
        const conditions: SQL<unknown>[] = [
            eq(transactionsTable.user_id, query.user_id),
            // Only include transactions that have categories (income, expense, credit types)
            inArray(transactionsTable.type, ['income', 'expense', 'credit']),
            // Ensure category_id is not null
            isNotNull(transactionsTable.category_id)
        ];

        // Add date filters if provided
        if (query.start_date) {
            conditions.push(gte(transactionsTable.transaction_date, query.start_date));
        }

        if (query.end_date) {
            conditions.push(lte(transactionsTable.transaction_date, query.end_date));
        }

        // Apply all conditions
        const finalQuery = transactionQuery.where(and(...conditions))
            .orderBy(desc(categoriesTable.name));

        const results = await finalQuery.execute();

        // Group transactions by category
        const categoryMap = new Map<number, {
            categoryId: number;
            categoryName: string;
            type: 'income' | 'expense' | 'credit';
            transactions: Array<{
                amount: number;
                transactionDate: Date;
            }>;
        }>();

        // Process results and group by category
        results.forEach(result => {
            const transaction = result.transactions;
            const category = result.categories;

            if (!categoryMap.has(category.id)) {
                categoryMap.set(category.id, {
                    categoryId: category.id,
                    categoryName: category.name,
                    type: category.type as 'income' | 'expense' | 'credit',
                    transactions: []
                });
            }

            categoryMap.get(category.id)!.transactions.push({
                amount: parseFloat(transaction.amount), // Convert numeric to number
                transactionDate: transaction.transaction_date
            });
        });

        // Build category report data
        const categories = Array.from(categoryMap.values()).map(categoryData => {
            const totalAmount = categoryData.transactions.reduce((sum, t) => sum + t.amount, 0);
            const transactionCount = categoryData.transactions.length;
            const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

            // Group transactions by month for breakdown
            const monthlyMap = new Map<string, {
                year: number;
                month: number;
                totalAmount: number;
                transactionCount: number;
            }>();

            categoryData.transactions.forEach(transaction => {
                const date = transaction.transactionDate;
                const year = date.getFullYear();
                const month = date.getMonth() + 1; // JavaScript months are 0-indexed
                const key = `${year}-${month}`;

                if (!monthlyMap.has(key)) {
                    monthlyMap.set(key, {
                        year,
                        month,
                        totalAmount: 0,
                        transactionCount: 0
                    });
                }

                const monthlyData = monthlyMap.get(key)!;
                monthlyData.totalAmount += transaction.amount;
                monthlyData.transactionCount += 1;
            });

            // Sort monthly breakdown by year and month
            const monthlyBreakdown = Array.from(monthlyMap.values())
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.month - b.month;
                });

            return {
                categoryId: categoryData.categoryId,
                categoryName: categoryData.categoryName,
                type: categoryData.type,
                totalAmount,
                transactionCount,
                averageAmount,
                monthlyBreakdown
            };
        });

        // Calculate totals by type
        const totalsByType = {
            income: 0,
            expense: 0,
            credit: 0
        };

        categories.forEach(category => {
            totalsByType[category.type] += category.totalAmount;
        });

        return {
            categories,
            totalsByType
        };
    } catch (error) {
        console.error('Category report generation failed:', error);
        throw error;
    }
};
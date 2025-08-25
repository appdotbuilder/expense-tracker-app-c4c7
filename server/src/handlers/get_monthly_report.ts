import { db } from '../db';
import { transactionsTable, categoriesTable, poolsTable } from '../db/schema';
import { type GetMonthlyReportQuery } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Monthly report data structure
export interface MonthlyReportData {
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

export const getMonthlyReport = async (query: GetMonthlyReportQuery): Promise<MonthlyReportData> => {
    try {
        const { user_id, year, month } = query;
        
        // Calculate the date range for the month
        const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month
        
        // Build base conditions for date range and user
        const baseConditions: SQL<unknown>[] = [
            eq(transactionsTable.user_id, user_id),
            gte(transactionsTable.transaction_date, startDate),
            lte(transactionsTable.transaction_date, endDate)
        ];
        
        // Get transaction totals by type
        const totalsQuery = db.select({
            type: transactionsTable.type,
            totalAmount: sql<string>`sum(${transactionsTable.amount})`.as('total_amount'),
            count: sql<string>`count(*)`.as('count')
        })
        .from(transactionsTable)
        .where(and(...baseConditions))
        .groupBy(transactionsTable.type);
        
        const totalsResults = await totalsQuery.execute();
        
        // Initialize totals
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalCredit = 0;
        let totalPayments = 0;
        let transactionCount = 0;
        
        // Process totals by transaction type
        totalsResults.forEach(result => {
            const amount = parseFloat(result.totalAmount);
            const count = parseInt(result.count);
            
            transactionCount += count;
            
            switch (result.type) {
                case 'income':
                    totalIncome = amount;
                    break;
                case 'expense':
                    totalExpenses = amount;
                    break;
                case 'credit':
                    totalCredit = amount;
                    break;
                case 'payment':
                    totalPayments = amount;
                    break;
            }
        });
        
        // Calculate net amount (income + payments - expenses - credit)
        const netAmount = totalIncome + totalPayments - totalExpenses - totalCredit;
        
        // Get category breakdown for transactions with categories
        const categoryQuery = db.select({
            categoryId: categoriesTable.id,
            categoryName: categoriesTable.name,
            type: categoriesTable.type,
            totalAmount: sql<string>`sum(${transactionsTable.amount})`.as('total_amount'),
            count: sql<string>`count(*)`.as('count')
        })
        .from(transactionsTable)
        .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
        .where(and(...baseConditions))
        .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.type);
        
        const categoryResults = await categoryQuery.execute();
        
        const categoryBreakdown = categoryResults.map(result => ({
            categoryId: result.categoryId,
            categoryName: result.categoryName,
            type: result.type as 'income' | 'expense' | 'credit',
            totalAmount: parseFloat(result.totalAmount),
            transactionCount: parseInt(result.count)
        }));
        
        // Get pool breakdown for transactions with pools
        const poolQuery = db.select({
            poolId: poolsTable.id,
            poolName: poolsTable.name,
            type: poolsTable.type,
            totalAmount: sql<string>`sum(${transactionsTable.amount})`.as('total_amount'),
            count: sql<string>`count(*)`.as('count')
        })
        .from(transactionsTable)
        .innerJoin(poolsTable, eq(transactionsTable.pool_id, poolsTable.id))
        .where(and(...baseConditions))
        .groupBy(poolsTable.id, poolsTable.name, poolsTable.type);
        
        const poolResults = await poolQuery.execute();
        
        const poolBreakdown = poolResults.map(result => ({
            poolId: result.poolId,
            poolName: result.poolName,
            type: result.type as 'income' | 'expense' | 'credit' | 'payment',
            totalAmount: parseFloat(result.totalAmount),
            transactionCount: parseInt(result.count)
        }));
        
        return {
            totalIncome,
            totalExpenses,
            totalCredit,
            totalPayments,
            netAmount,
            transactionCount,
            categoryBreakdown,
            poolBreakdown
        };
    } catch (error) {
        console.error('Monthly report generation failed:', error);
        throw error;
    }
};
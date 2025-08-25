import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, vendorsTable, poolsTable, transactionsTable } from '../db/schema';
import { type GetMonthlyReportQuery } from '../schema';
import { getMonthlyReport } from '../handlers/get_monthly_report';

// Test data
const testUser = {
    email: 'test@example.com',
    name: 'Test User'
};

const testCategories = [
    { name: 'Salary', type: 'income' as const },
    { name: 'Groceries', type: 'expense' as const },
    { name: 'Loan', type: 'credit' as const }
];

const testVendor = {
    name: 'Test Vendor',
    description: 'A vendor for testing'
};

const testPools = [
    { name: 'Salary Pool', type: 'income' as const, description: 'Income pool' },
    { name: 'Monthly Expenses', type: 'expense' as const, description: 'Expense pool' },
    { name: 'Credit Pool', type: 'credit' as const, description: 'Credit pool' },
    { name: 'Payment Pool', type: 'payment' as const, description: 'Payment pool' }
];

describe('getMonthlyReport', () => {
    let userId: number;
    let categoryIds: { [key: string]: number } = {};
    let vendorId: number;
    let poolIds: { [key: string]: number } = {};

    beforeEach(async () => {
        await createDB();
        
        // Create test user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        userId = userResult[0].id;
        
        // Create test categories
        for (const category of testCategories) {
            const categoryResult = await db.insert(categoriesTable)
                .values({
                    user_id: userId,
                    name: category.name,
                    type: category.type
                })
                .returning()
                .execute();
            categoryIds[category.name] = categoryResult[0].id;
        }
        
        // Create test vendor
        const vendorResult = await db.insert(vendorsTable)
            .values({
                user_id: userId,
                name: testVendor.name,
                description: testVendor.description
            })
            .returning()
            .execute();
        vendorId = vendorResult[0].id;
        
        // Create test pools
        for (const pool of testPools) {
            const poolResult = await db.insert(poolsTable)
                .values({
                    user_id: userId,
                    name: pool.name,
                    type: pool.type,
                    description: pool.description
                })
                .returning()
                .execute();
            poolIds[pool.name] = poolResult[0].id;
        }
    });
    
    afterEach(resetDB);

    it('should generate empty report for month with no transactions', async () => {
        const query: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 1
        };

        const result = await getMonthlyReport(query);

        expect(result.totalIncome).toEqual(0);
        expect(result.totalExpenses).toEqual(0);
        expect(result.totalCredit).toEqual(0);
        expect(result.totalPayments).toEqual(0);
        expect(result.netAmount).toEqual(0);
        expect(result.transactionCount).toEqual(0);
        expect(result.categoryBreakdown).toHaveLength(0);
        expect(result.poolBreakdown).toHaveLength(0);
    });

    it('should generate comprehensive report with all transaction types', async () => {
        // Create transactions for January 2024
        const transactions = [
            // Income transactions
            {
                user_id: userId,
                pool_id: poolIds['Salary Pool'],
                type: 'income' as const,
                amount: '50000.00',
                description: 'January Salary',
                category_id: categoryIds['Salary'],
                transaction_date: new Date('2024-01-15')
            },
            {
                user_id: userId,
                pool_id: poolIds['Salary Pool'],
                type: 'income' as const,
                amount: '5000.00',
                description: 'Bonus',
                category_id: categoryIds['Salary'],
                transaction_date: new Date('2024-01-20')
            },
            // Expense transactions
            {
                user_id: userId,
                pool_id: poolIds['Monthly Expenses'],
                type: 'expense' as const,
                amount: '3000.00',
                description: 'Groceries',
                category_id: categoryIds['Groceries'],
                transaction_date: new Date('2024-01-10')
            },
            {
                user_id: userId,
                pool_id: poolIds['Monthly Expenses'],
                type: 'expense' as const,
                amount: '2000.00',
                description: 'More groceries',
                category_id: categoryIds['Groceries'],
                transaction_date: new Date('2024-01-25')
            },
            // Credit transactions
            {
                user_id: userId,
                pool_id: poolIds['Credit Pool'],
                type: 'credit' as const,
                amount: '10000.00',
                description: 'Personal loan',
                category_id: categoryIds['Loan'],
                associated_person: 'John Doe',
                transaction_date: new Date('2024-01-05')
            },
            // Payment transactions
            {
                user_id: userId,
                pool_id: poolIds['Payment Pool'],
                type: 'payment' as const,
                amount: '1500.00',
                description: 'Utility bill',
                vendor_id: vendorId,
                transaction_date: new Date('2024-01-12')
            }
        ];

        for (const transaction of transactions) {
            await db.insert(transactionsTable)
                .values(transaction)
                .execute();
        }

        const query: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 1
        };

        const result = await getMonthlyReport(query);

        // Verify totals
        expect(result.totalIncome).toEqual(55000); // 50000 + 5000
        expect(result.totalExpenses).toEqual(5000); // 3000 + 2000
        expect(result.totalCredit).toEqual(10000);
        expect(result.totalPayments).toEqual(1500);
        expect(result.netAmount).toEqual(41500); // 55000 + 1500 - 5000 - 10000
        expect(result.transactionCount).toEqual(6);

        // Verify category breakdown
        expect(result.categoryBreakdown).toHaveLength(3);
        
        const salaryCategory = result.categoryBreakdown.find(c => c.categoryName === 'Salary');
        expect(salaryCategory).toBeDefined();
        expect(salaryCategory!.type).toEqual('income');
        expect(salaryCategory!.totalAmount).toEqual(55000);
        expect(salaryCategory!.transactionCount).toEqual(2);

        const groceriesCategory = result.categoryBreakdown.find(c => c.categoryName === 'Groceries');
        expect(groceriesCategory).toBeDefined();
        expect(groceriesCategory!.type).toEqual('expense');
        expect(groceriesCategory!.totalAmount).toEqual(5000);
        expect(groceriesCategory!.transactionCount).toEqual(2);

        const loanCategory = result.categoryBreakdown.find(c => c.categoryName === 'Loan');
        expect(loanCategory).toBeDefined();
        expect(loanCategory!.type).toEqual('credit');
        expect(loanCategory!.totalAmount).toEqual(10000);
        expect(loanCategory!.transactionCount).toEqual(1);

        // Verify pool breakdown
        expect(result.poolBreakdown).toHaveLength(4);
        
        const salaryPool = result.poolBreakdown.find(p => p.poolName === 'Salary Pool');
        expect(salaryPool).toBeDefined();
        expect(salaryPool!.type).toEqual('income');
        expect(salaryPool!.totalAmount).toEqual(55000);
        expect(salaryPool!.transactionCount).toEqual(2);

        const expensesPool = result.poolBreakdown.find(p => p.poolName === 'Monthly Expenses');
        expect(expensesPool).toBeDefined();
        expect(expensesPool!.type).toEqual('expense');
        expect(expensesPool!.totalAmount).toEqual(5000);
        expect(expensesPool!.transactionCount).toEqual(2);

        const creditPool = result.poolBreakdown.find(p => p.poolName === 'Credit Pool');
        expect(creditPool).toBeDefined();
        expect(creditPool!.type).toEqual('credit');
        expect(creditPool!.totalAmount).toEqual(10000);
        expect(creditPool!.transactionCount).toEqual(1);

        const paymentPool = result.poolBreakdown.find(p => p.poolName === 'Payment Pool');
        expect(paymentPool).toBeDefined();
        expect(paymentPool!.type).toEqual('payment');
        expect(paymentPool!.totalAmount).toEqual(1500);
        expect(paymentPool!.transactionCount).toEqual(1);
    });

    it('should filter transactions by month correctly', async () => {
        // Create transactions in different months
        const transactions = [
            // January 2024
            {
                user_id: userId,
                type: 'income' as const,
                amount: '10000.00',
                description: 'January income',
                category_id: categoryIds['Salary'],
                transaction_date: new Date('2024-01-15')
            },
            // February 2024
            {
                user_id: userId,
                type: 'income' as const,
                amount: '20000.00',
                description: 'February income',
                category_id: categoryIds['Salary'],
                transaction_date: new Date('2024-02-15')
            },
            // December 2023
            {
                user_id: userId,
                type: 'expense' as const,
                amount: '5000.00',
                description: 'December expense',
                category_id: categoryIds['Groceries'],
                transaction_date: new Date('2023-12-31')
            }
        ];

        for (const transaction of transactions) {
            await db.insert(transactionsTable)
                .values(transaction)
                .execute();
        }

        // Query for January 2024
        const januaryQuery: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 1
        };

        const januaryResult = await getMonthlyReport(januaryQuery);
        
        expect(januaryResult.totalIncome).toEqual(10000);
        expect(januaryResult.totalExpenses).toEqual(0);
        expect(januaryResult.transactionCount).toEqual(1);
        expect(januaryResult.categoryBreakdown).toHaveLength(1);
        expect(januaryResult.categoryBreakdown[0].categoryName).toEqual('Salary');

        // Query for February 2024
        const februaryQuery: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 2
        };

        const februaryResult = await getMonthlyReport(februaryQuery);
        
        expect(februaryResult.totalIncome).toEqual(20000);
        expect(februaryResult.totalExpenses).toEqual(0);
        expect(februaryResult.transactionCount).toEqual(1);
        expect(februaryResult.categoryBreakdown).toHaveLength(1);
        expect(februaryResult.categoryBreakdown[0].categoryName).toEqual('Salary');
    });

    it('should handle transactions without categories or pools', async () => {
        // Create transactions without category and pool associations
        const transactions = [
            {
                user_id: userId,
                type: 'payment' as const,
                amount: '1000.00',
                description: 'Payment without pool',
                vendor_id: vendorId,
                transaction_date: new Date('2024-01-15')
            }
        ];

        for (const transaction of transactions) {
            await db.insert(transactionsTable)
                .values(transaction)
                .execute();
        }

        const query: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 1
        };

        const result = await getMonthlyReport(query);

        expect(result.totalPayments).toEqual(1000);
        expect(result.transactionCount).toEqual(1);
        expect(result.categoryBreakdown).toHaveLength(0); // No category associated
        expect(result.poolBreakdown).toHaveLength(0); // No pool associated
    });

    it('should only include transactions for the specified user', async () => {
        // Create another user
        const otherUserResult = await db.insert(usersTable)
            .values({
                email: 'other@example.com',
                name: 'Other User'
            })
            .returning()
            .execute();
        const otherUserId = otherUserResult[0].id;

        // Create category for other user
        const otherCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: otherUserId,
                name: 'Other Income',
                type: 'income'
            })
            .returning()
            .execute();

        // Create transactions for both users in the same month
        const transactions = [
            {
                user_id: userId,
                type: 'income' as const,
                amount: '10000.00',
                description: 'My income',
                category_id: categoryIds['Salary'],
                transaction_date: new Date('2024-01-15')
            },
            {
                user_id: otherUserId,
                type: 'income' as const,
                amount: '50000.00',
                description: 'Other income',
                category_id: otherCategoryResult[0].id,
                transaction_date: new Date('2024-01-15')
            }
        ];

        for (const transaction of transactions) {
            await db.insert(transactionsTable)
                .values(transaction)
                .execute();
        }

        const query: GetMonthlyReportQuery = {
            user_id: userId,
            year: 2024,
            month: 1
        };

        const result = await getMonthlyReport(query);

        expect(result.totalIncome).toEqual(10000); // Only our user's transaction
        expect(result.transactionCount).toEqual(1);
        expect(result.categoryBreakdown).toHaveLength(1);
        expect(result.categoryBreakdown[0].categoryName).toEqual('Salary');
    });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetCategoryReportQuery } from '../schema';
import { getCategoryReport } from '../handlers/get_category_report';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testCategories = [
  { name: 'Salary', type: 'income' as const },
  { name: 'Groceries', type: 'expense' as const },
  { name: 'Loan to Friend', type: 'credit' as const }
];

describe('getCategoryReport', () => {
  let userId: number;
  let categoryIds: { income: number; expense: number; credit: number };

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test categories
    const categoryResults = await db.insert(categoriesTable)
      .values(testCategories.map(cat => ({ ...cat, user_id: userId })))
      .returning()
      .execute();

    categoryIds = {
      income: categoryResults.find(c => c.type === 'income')!.id,
      expense: categoryResults.find(c => c.type === 'expense')!.id,
      credit: categoryResults.find(c => c.type === 'credit')!.id
    };
  });

  afterEach(resetDB);

  it('should return empty report for user with no transactions', async () => {
    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    expect(result.categories).toHaveLength(0);
    expect(result.totalsByType).toEqual({
      income: 0,
      expense: 0,
      credit: 0
    });
  });

  it('should generate basic category report with transactions', async () => {
    // Create test transactions
    const transactions = [
      {
        user_id: userId,
        type: 'income' as const,
        amount: '50000.00',
        description: 'Monthly salary',
        category_id: categoryIds.income,
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '5000.00',
        description: 'Weekly groceries',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-01-10')
      },
      {
        user_id: userId,
        type: 'credit' as const,
        amount: '10000.00',
        description: 'Loan to John',
        category_id: categoryIds.credit,
        transaction_date: new Date('2024-01-20')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    expect(result.categories).toHaveLength(3);
    expect(result.totalsByType).toEqual({
      income: 50000,
      expense: 5000,
      credit: 10000
    });

    // Check income category details
    const incomeCategory = result.categories.find(c => c.type === 'income');
    expect(incomeCategory).toBeDefined();
    expect(incomeCategory!.categoryName).toEqual('Salary');
    expect(incomeCategory!.totalAmount).toEqual(50000);
    expect(incomeCategory!.transactionCount).toEqual(1);
    expect(incomeCategory!.averageAmount).toEqual(50000);
    expect(incomeCategory!.monthlyBreakdown).toHaveLength(1);
    expect(incomeCategory!.monthlyBreakdown[0]).toEqual({
      year: 2024,
      month: 1,
      totalAmount: 50000,
      transactionCount: 1
    });
  });

  it('should handle multiple transactions in same category', async () => {
    // Create multiple expense transactions
    const transactions = [
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '3000.00',
        description: 'Weekly groceries 1',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-01-05')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '2500.00',
        description: 'Weekly groceries 2',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-01-12')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '4000.00',
        description: 'Monthly groceries',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-02-01')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    const expenseCategory = result.categories.find(c => c.type === 'expense');
    expect(expenseCategory).toBeDefined();
    expect(expenseCategory!.totalAmount).toEqual(9500);
    expect(expenseCategory!.transactionCount).toEqual(3);
    expect(expenseCategory!.averageAmount).toEqual(9500 / 3);
    expect(expenseCategory!.monthlyBreakdown).toHaveLength(2);

    // Check January breakdown
    const januaryBreakdown = expenseCategory!.monthlyBreakdown.find(m => m.month === 1);
    expect(januaryBreakdown).toEqual({
      year: 2024,
      month: 1,
      totalAmount: 5500,
      transactionCount: 2
    });

    // Check February breakdown
    const februaryBreakdown = expenseCategory!.monthlyBreakdown.find(m => m.month === 2);
    expect(februaryBreakdown).toEqual({
      year: 2024,
      month: 2,
      totalAmount: 4000,
      transactionCount: 1
    });
  });

  it('should filter transactions by date range', async () => {
    // Create transactions across multiple months
    const transactions = [
      {
        user_id: userId,
        type: 'income' as const,
        amount: '40000.00',
        description: 'December salary',
        category_id: categoryIds.income,
        transaction_date: new Date('2023-12-25')
      },
      {
        user_id: userId,
        type: 'income' as const,
        amount: '50000.00',
        description: 'January salary',
        category_id: categoryIds.income,
        transaction_date: new Date('2024-01-25')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '5000.00',
        description: 'January groceries',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '6000.00',
        description: 'February groceries',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-02-15')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    // Query for January 2024 only
    const query: GetCategoryReportQuery = {
      user_id: userId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };
    const result = await getCategoryReport(query);

    expect(result.totalsByType).toEqual({
      income: 50000,
      expense: 5000,
      credit: 0
    });

    const incomeCategory = result.categories.find(c => c.type === 'income');
    expect(incomeCategory!.monthlyBreakdown).toHaveLength(1);
    expect(incomeCategory!.monthlyBreakdown[0].month).toEqual(1);

    const expenseCategory = result.categories.find(c => c.type === 'expense');
    expect(expenseCategory!.monthlyBreakdown).toHaveLength(1);
    expect(expenseCategory!.monthlyBreakdown[0].month).toEqual(1);
  });

  it('should handle date range with only start date', async () => {
    const transactions = [
      {
        user_id: userId,
        type: 'income' as const,
        amount: '30000.00',
        description: 'Early income',
        category_id: categoryIds.income,
        transaction_date: new Date('2023-12-01')
      },
      {
        user_id: userId,
        type: 'income' as const,
        amount: '50000.00',
        description: 'Later income',
        category_id: categoryIds.income,
        transaction_date: new Date('2024-02-01')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = {
      user_id: userId,
      start_date: new Date('2024-01-01')
    };
    const result = await getCategoryReport(query);

    expect(result.totalsByType.income).toEqual(50000);
    const incomeCategory = result.categories.find(c => c.type === 'income');
    expect(incomeCategory!.transactionCount).toEqual(1);
  });

  it('should handle date range with only end date', async () => {
    const transactions = [
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '3000.00',
        description: 'Early expense',
        category_id: categoryIds.expense,
        transaction_date: new Date('2023-12-01')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '5000.00',
        description: 'Later expense',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-02-01')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = {
      user_id: userId,
      end_date: new Date('2024-01-31')
    };
    const result = await getCategoryReport(query);

    expect(result.totalsByType.expense).toEqual(3000);
    const expenseCategory = result.categories.find(c => c.type === 'expense');
    expect(expenseCategory!.transactionCount).toEqual(1);
  });

  it('should only include transactions with categories', async () => {
    // Create a payment transaction (no category)
    const transactions = [
      {
        user_id: userId,
        type: 'payment' as const,
        amount: '1000.00',
        description: 'Payment transaction',
        category_id: null,
        vendor_id: null,
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        type: 'income' as const,
        amount: '50000.00',
        description: 'Salary',
        category_id: categoryIds.income,
        transaction_date: new Date('2024-01-25')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    // Should only include the income transaction, not the payment
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].type).toEqual('income');
    expect(result.totalsByType).toEqual({
      income: 50000,
      expense: 0,
      credit: 0
    });
  });

  it('should sort monthly breakdown chronologically', async () => {
    const transactions = [
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '1000.00',
        description: 'March expense',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-03-15')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '2000.00',
        description: 'January expense',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: userId,
        type: 'expense' as const,
        amount: '1500.00',
        description: 'February expense',
        category_id: categoryIds.expense,
        transaction_date: new Date('2024-02-15')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    const expenseCategory = result.categories.find(c => c.type === 'expense');
    expect(expenseCategory!.monthlyBreakdown).toHaveLength(3);

    // Check chronological order
    expect(expenseCategory!.monthlyBreakdown[0].month).toEqual(1);
    expect(expenseCategory!.monthlyBreakdown[1].month).toEqual(2);
    expect(expenseCategory!.monthlyBreakdown[2].month).toEqual(3);

    expect(expenseCategory!.monthlyBreakdown[0].totalAmount).toEqual(2000);
    expect(expenseCategory!.monthlyBreakdown[1].totalAmount).toEqual(1500);
    expect(expenseCategory!.monthlyBreakdown[2].totalAmount).toEqual(1000);
  });

  it('should not include transactions from other users', async () => {
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
    const otherCategoryId = otherCategoryResult[0].id;

    // Create transactions for both users
    const transactions = [
      {
        user_id: userId,
        type: 'income' as const,
        amount: '30000.00',
        description: 'My income',
        category_id: categoryIds.income,
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: otherUserId,
        type: 'income' as const,
        amount: '80000.00',
        description: 'Other user income',
        category_id: otherCategoryId,
        transaction_date: new Date('2024-01-15')
      }
    ];

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const query: GetCategoryReportQuery = { user_id: userId };
    const result = await getCategoryReport(query);

    // Should only include current user's transactions
    expect(result.categories).toHaveLength(1);
    expect(result.totalsByType.income).toEqual(30000);
    expect(result.categories[0].categoryName).toEqual('Salary');
  });
});
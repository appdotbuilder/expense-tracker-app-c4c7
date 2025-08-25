import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schema types
import {
    createUserInputSchema,
    createCategoryInputSchema,
    createVendorInputSchema,
    createPoolInputSchema,
    createBudgetInputSchema,
    createTransactionInputSchema,
    updateTransactionInputSchema,
    getTransactionsQuerySchema,
    getMonthlyReportQuerySchema,
    getCategoryReportQuerySchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { createCategory } from './handlers/create_category';
import { createVendor } from './handlers/create_vendor';
import { createPool } from './handlers/create_pool';
import { createBudget } from './handlers/create_budget';
import { createTransaction } from './handlers/create_transaction';
import { updateTransaction } from './handlers/update_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getUserCategories } from './handlers/get_user_categories';
import { getUserVendors } from './handlers/get_user_vendors';
import { getUserPools } from './handlers/get_user_pools';
import { getPoolBudgets } from './handlers/get_pool_budgets';
import { getMonthlyReport } from './handlers/get_monthly_report';
import { getCategoryReport } from './handlers/get_category_report';
import { deleteTransaction } from './handlers/delete_transaction';

const t = initTRPC.create({
    transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
    // Health check
    healthcheck: publicProcedure.query(() => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }),

    // User management
    createUser: publicProcedure
        .input(createUserInputSchema)
        .mutation(({ input }) => createUser(input)),

    // Category management
    createCategory: publicProcedure
        .input(createCategoryInputSchema)
        .mutation(({ input }) => createCategory(input)),

    getUserCategories: publicProcedure
        .input(z.object({ userId: z.number() }))
        .query(({ input }) => getUserCategories(input.userId)),

    // Vendor management
    createVendor: publicProcedure
        .input(createVendorInputSchema)
        .mutation(({ input }) => createVendor(input)),

    getUserVendors: publicProcedure
        .input(z.object({ userId: z.number() }))
        .query(({ input }) => getUserVendors(input.userId)),

    // Pool management
    createPool: publicProcedure
        .input(createPoolInputSchema)
        .mutation(({ input }) => createPool(input)),

    getUserPools: publicProcedure
        .input(z.object({ userId: z.number() }))
        .query(({ input }) => getUserPools(input.userId)),

    // Budget management
    createBudget: publicProcedure
        .input(createBudgetInputSchema)
        .mutation(({ input }) => createBudget(input)),

    getPoolBudgets: publicProcedure
        .input(z.object({ poolId: z.number() }))
        .query(({ input }) => getPoolBudgets(input.poolId)),

    // Transaction management
    createTransaction: publicProcedure
        .input(createTransactionInputSchema)
        .mutation(({ input }) => createTransaction(input)),

    updateTransaction: publicProcedure
        .input(updateTransactionInputSchema)
        .mutation(({ input }) => updateTransaction(input)),

    getTransactions: publicProcedure
        .input(getTransactionsQuerySchema)
        .query(({ input }) => getTransactions(input)),

    deleteTransaction: publicProcedure
        .input(z.object({ transactionId: z.number() }))
        .mutation(({ input }) => deleteTransaction(input.transactionId)),

    // Reporting
    getMonthlyReport: publicProcedure
        .input(getMonthlyReportQuerySchema)
        .query(({ input }) => getMonthlyReport(input)),

    getCategoryReport: publicProcedure
        .input(getCategoryReportQuerySchema)
        .query(({ input }) => getCategoryReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
    const port = process.env['SERVER_PORT'] || 2022;
    const server = createHTTPServer({
        middleware: (req, res, next) => {
            cors()(req, res, next);
        },
        router: appRouter,
        createContext() {
            return {};
        },
    });
    server.listen(port);
    console.log(`TRPC server listening at port: ${port}`);
}

start();
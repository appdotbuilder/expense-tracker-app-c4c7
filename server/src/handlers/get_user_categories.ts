import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getUserCategories = async (userId: number): Promise<Category[]> => {
  try {
    // Query categories for the specific user, ordered by name
    const result = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, userId))
      .orderBy(asc(categoriesTable.name))
      .execute();

    // Return the categories (no numeric conversion needed for this table)
    return result;
  } catch (error) {
    console.error('Get user categories failed:', error);
    throw error;
  }
};
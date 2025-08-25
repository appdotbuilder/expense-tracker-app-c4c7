import { db } from '../db';
import { poolsTable } from '../db/schema';
import { type CreatePoolInput, type Pool } from '../schema';

export const createPool = async (input: CreatePoolInput): Promise<Pool> => {
  try {
    // Insert pool record
    const result = await db.insert(poolsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        type: input.type,
        description: input.description
      })
      .returning()
      .execute();

    const pool = result[0];
    return pool;
  } catch (error) {
    console.error('Pool creation failed:', error);
    throw error;
  }
};
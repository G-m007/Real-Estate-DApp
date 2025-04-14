import { NextResponse } from 'next/server';
import { neon, neonConfig } from '@neondatabase/serverless';
import { auth } from '@clerk/nextjs/server';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      buyer_id,
      buyer_wallet_address,
      tx_hash,
      tokens,
      amount,
      property_id
    } = await request.json();

    // Execute all queries in a transaction
    await sql.transaction([
      // 1. Update the sell order status
      sql`
        UPDATE sell_orders
        SET 
          status = 'COMPLETED',
          buyer_id = ${buyer_id},
          tx_hash = ${tx_hash},
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${params.id}
        AND status = 'PENDING'
        RETURNING *
      `,
      // 2. Create a new investment record for the buyer
      sql`
        INSERT INTO investments (
          property_id,
          user_id,
          amount,
          tokens,
          tx_hash,
          wallet_address
        ) VALUES (
          ${property_id},
          ${buyer_id},
          ${amount},
          ${tokens},
          ${tx_hash},
          ${buyer_wallet_address}
        )
      `,
      // 3. Update the seller's investment record (reduce their tokens)
      sql`
        UPDATE investments i
        SET 
          tokens = tokens - ${tokens},
          updated_at = CURRENT_TIMESTAMP
        FROM sell_orders s
        WHERE 
          s.id = ${params.id}
          AND i.property_id = ${property_id}
          AND i.user_id = s.user_id
          AND i.wallet_address = s.wallet_address
      `
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing purchase:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete purchase' },
      { status: 500 }
    );
  }
} 
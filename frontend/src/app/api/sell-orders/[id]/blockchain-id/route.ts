import { NextResponse } from 'next/server';
import { neon, neonConfig } from '@neondatabase/serverless';
import { auth } from '@clerk/nextjs/server';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
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

    // Get the blockchain sell order ID from the database
    const [sellOrder] = await sql`
      SELECT blockchain_sell_order_id
      FROM sell_orders
      WHERE id = ${params.id}
      AND status = 'PENDING'
    `;

    if (!sellOrder || !sellOrder.blockchain_sell_order_id) {
      return NextResponse.json(
        { success: false, error: 'Sell order not found or no blockchain ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      blockchainSellOrderId: sellOrder.blockchain_sell_order_id
    });
  } catch (error) {
    console.error('Error getting blockchain sell order ID:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get blockchain sell order ID' },
      { status: 500 }
    );
  }
} 
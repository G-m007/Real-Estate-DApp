import { NextRequest, NextResponse } from 'next/server';
import { neon, neonConfig } from '@neondatabase/serverless';
import { auth } from '@clerk/nextjs/server';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

// POST endpoint to create a new sell order
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      property_id,
      tokens,
      price_per_token,
      wallet_address,
      blockchain_sell_order_id,
      tx_hash
    } = await request.json();

    // Create the sell order
    const [sellOrder] = await sql`
      INSERT INTO sell_orders (
        user_id,
        property_id,
        tokens,
        price_per_token,
        wallet_address,
        blockchain_sell_order_id,
        tx_hash,
        status
      ) VALUES (
        ${userId},
        ${property_id},
        ${tokens},
        ${price_per_token},
        ${wallet_address},
        ${blockchain_sell_order_id},
        ${tx_hash},
        'PENDING'
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      sellOrder
    });
  } catch (error) {
    console.error('Error creating sell order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sell order' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch sell orders
export async function GET(req: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const property_id = searchParams.get('property_id');

    console.log('Fetching sell orders with params:', { user_id, property_id });

    let query = sql`
      SELECT 
        so.*,
        p.name as property_name,
        p.location,
        p.images
      FROM sell_orders so
      JOIN properties p ON so.property_id = p.id
      WHERE 1=1
    `;

    if (user_id) {
      // If user_id is provided, show all their orders
      query = sql`${query} AND so.user_id = ${user_id}`;
    } else {
      // If no user_id, only show pending orders from other users
      query = sql`${query} AND so.status = 'PENDING'`;
    }

    if (property_id) {
      query = sql`${query} AND so.property_id = ${property_id}`;
    }

    query = sql`${query} ORDER BY so.created_at DESC`;

    console.log('Executing query for sell orders');
    const sellOrders = await query;
    console.log('Found sell orders:', sellOrders);

    return NextResponse.json({
      success: true,
      sellOrders: sellOrders.map(order => ({
        ...order,
        imageUrl: order.images?.[0] || '',
        price_per_token: parseFloat(order.price_per_token)
      }))
    });
  } catch (error: any) {
    console.error('Error fetching sell orders:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch sell orders'
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { user_id, property_id, tokens, price_per_token, status = 'PENDING' } = await request.json();

    // Validate required fields
    if (!user_id || !property_id || !tokens || !price_per_token) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Create sell order
    const sellOrder = await sql`
      INSERT INTO sell_orders (
        user_id,
        property_id,
        tokens,
        price_per_token,
        status,
        buyer_id
      ) VALUES (
        ${user_id},
        ${property_id}::uuid,
        ${tokens},
        ${price_per_token},
        ${status},
        NULL
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      sellOrder: sellOrder[0]
    });

  } catch (error: any) {
    console.error('Error creating sell order:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const property_id = searchParams.get('property_id');

    let query = sql`
      SELECT 
        so.*,
        p.name as property_name,
        p.location,
        p.images[0] as image_url,
        CASE 
          WHEN so.buyer_id IS NOT NULL THEN 'COMPLETED'
          WHEN so.status = 'CANCELLED' THEN 'CANCELLED'
          ELSE 'OPEN'
        END as order_status
      FROM sell_orders so
      JOIN properties p ON so.property_id = p.id
    `;

    if (user_id) {
      query = sql`${query} WHERE so.user_id = ${user_id}`;
    }

    if (property_id) {
      query = sql`${query} ${user_id ? 'AND' : 'WHERE'} so.property_id = ${property_id}::uuid`;
    }

    query = sql`${query} ORDER BY so.created_at DESC`;

    const sellOrders = await query;

    // Format the sell orders to ensure numeric fields are proper numbers
    const formattedSellOrders = sellOrders.map(order => ({
      ...order,
      tokens: Number(order.tokens),
      price_per_token: Number(order.price_per_token)
    }));

    return NextResponse.json({
      success: true,
      sellOrders: formattedSellOrders
    });

  } catch (error: any) {
    console.error('Error fetching sell orders:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
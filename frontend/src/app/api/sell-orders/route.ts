import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// POST endpoint to create a new sell order
export async function POST(req: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    const body = await req.json();
    const { property_id, user_id, tokens, price_per_token, wallet_address, tx_hash } = body;

    // Validate required fields
    if (!property_id || !user_id || !tokens || !price_per_token || !wallet_address || !tx_hash) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Insert the sell order
    const response = await sql`
      INSERT INTO sell_orders (
        property_id,
        user_id,
        tokens,
        price_per_token,
        wallet_address,
        tx_hash,
        status
      ) VALUES (
        ${property_id},
        ${user_id},
        ${tokens},
        ${price_per_token},
        ${wallet_address},
        ${tx_hash},
        'OPEN'
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      sellOrder: response[0]
    });
  } catch (error: any) {
    console.error('Error creating sell order:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create sell order'
    }, { status: 500 });
  }
}

// GET endpoint to fetch sell orders
export async function GET(req: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const property_id = searchParams.get('property_id');

    let query = sql`
      SELECT 
        so.*,
        p.name as property_name,
        p.location
      FROM sell_orders so
      JOIN properties p ON so.property_id = p.id
      WHERE 1=1
    `;

    if (user_id) {
      query = sql`${query} AND so.user_id = ${user_id}`;
    }

    if (property_id) {
      query = sql`${query} AND so.property_id = ${property_id}`;
    }

    query = sql`${query} ORDER BY so.created_at DESC`;

    const sellOrders = await query;

    return NextResponse.json({
      success: true,
      sellOrders
    });
  } catch (error: any) {
    console.error('Error fetching sell orders:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch sell orders'
    }, { status: 500 });
  }
} 
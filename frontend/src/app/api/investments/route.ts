import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// POST /api/investments - Create a new investment record
export async function POST(request: Request) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    const body = await request.json();
    console.log('Received investment data:', body);

    // Extract data from request body
    const { property_id, user_id, amount, tokens, tx_hash, wallet_address } = body;

    // Validate required fields
    if (!property_id || !user_id || !amount || !tokens || !tx_hash || !wallet_address) {
      console.error('Missing required fields:', { property_id, user_id, amount, tokens, tx_hash, wallet_address });
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Insert investment record
      const response = await sql`
        INSERT INTO investments (
          property_id,
          user_id,
          amount,
          tokens,
          transaction_hash,
          wallet_address,
          status,
          created_at
        ) VALUES (
          ${property_id},
          ${user_id},
          ${amount},
          ${tokens},
          ${tx_hash},
          ${wallet_address},
          'completed',
          NOW()
        )
        RETURNING *
      `;

      console.log('Investment recorded successfully:', response);

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        data: response[0]
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      console.error('Database transaction error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error storing investment:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to record investment',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// GET /api/investments - Get all investments or filter by user_id
export async function GET(req: Request) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const walletAddress = searchParams.get('wallet_address');

  try {
    let query = sql`
      SELECT 
        i.*,
        p.name as property_name,
        p.location as property_location,
        p.image_url as property_image
      FROM investments i
      JOIN properties p ON i.property_id = p.id
    `;

    if (userId) {
      query = sql`
        ${query} WHERE i.user_id = ${userId}
      `;
    } else if (walletAddress) {
      query = sql`
        ${query} WHERE i.wallet_address = ${walletAddress}
      `;
    }

    query = sql`
      ${query} ORDER BY i.created_at DESC
    `;

    const investments = await query;

    return NextResponse.json({
      success: true,
      investments
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch investments',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// POST /api/investments - Create a new investment record
export async function POST(req: Request) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    const { property_id, user_id, amount, tokens, tx_hash, wallet_address } = await req.json();

    // Validate required fields
    if (!property_id || !user_id || !amount || !tokens || !tx_hash || !wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Insert the investment record
      const result = await sql`
        INSERT INTO investments (
          property_id,
          user_id,
          amount,
          tokens,
          tx_hash,
          wallet_address,
          created_at
        ) VALUES (
          ${property_id},
          ${user_id},
          ${amount},
          ${tokens},
          ${tx_hash},
          ${wallet_address},
          NOW()
        ) RETURNING *
      `;

      // Update property available tokens
      await sql`
        UPDATE properties 
        SET available_tokens = available_tokens - ${tokens}
        WHERE id = ${property_id}
      `;

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Investment recorded successfully'
      });

    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to record investment',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
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
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
      // Verify the property exists
      console.log('Verifying property with ID:', property_id);
      const property = await sql`
        SELECT id FROM properties 
        WHERE id = ${property_id}
      `;

      console.log('Property lookup result:', property);

      if (!property || property.length === 0) {
        // Try to get all properties to debug
        const allProperties = await sql`
          SELECT id, name FROM properties
        `;
        console.log('All available properties:', allProperties);
        throw new Error(`Property not found. Available properties: ${JSON.stringify(allProperties)}`);
      }

      // Insert investment record with the property UUID
      const response = await sql`
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

// GET /api/investments - Get all investments for a user
export async function GET(request: Request) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Get investments with property details
    const investments = await sql`
      SELECT 
        i.*,
        p.name as property_name,
        p.location,
        p.images,
        p.price,
        p.expected_return
      FROM investments i
      JOIN properties p ON i.property_id = p.id
      WHERE i.user_id = ${userId}
      ORDER BY i.created_at DESC
    `;

    // Format the investments for the frontend
    const formattedInvestments = investments.map(investment => ({
      id: investment.id,
      propertyId: investment.property_id,
      propertyName: investment.property_name,
      location: investment.location,
      imageUrl: investment.images[0] || '',
      amount: investment.amount,
      tokens: investment.tokens,
      txHash: investment.tx_hash,
      walletAddress: investment.wallet_address,
      createdAt: investment.created_at,
      expectedReturn: investment.expected_return,
      propertyValue: investment.price
    }));

    return NextResponse.json({
      success: true,
      investments: formattedInvestments
    });

  } catch (error: any) {
    console.error('Error fetching investments:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch investments',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 
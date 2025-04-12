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
      // Check if transaction already exists
      const existingTx = await sql`
        SELECT id FROM investments 
        WHERE tx_hash = ${tx_hash}
      `;

      if (existingTx && existingTx.length > 0) {
        console.log('Transaction already exists:', tx_hash);
        await sql`ROLLBACK`;
        return NextResponse.json({
          success: true,
          message: 'Transaction already recorded',
          data: existingTx[0]
        });
      }

      // Verify the property exists and get current available tokens
      console.log('Verifying property with ID:', property_id);
      const property = await sql`
        SELECT id, available_tokens FROM properties 
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

      // Check if there are enough available tokens
      const currentAvailableTokens = property[0].available_tokens;
      if (currentAvailableTokens < tokens) {
        throw new Error(`Not enough available tokens. Available: ${currentAvailableTokens}, Requested: ${tokens}`);
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

      // Update available tokens in the properties table
      const newAvailableTokens = currentAvailableTokens - tokens;
      await sql`
        UPDATE properties 
        SET available_tokens = ${newAvailableTokens}
        WHERE id = ${property_id}
      `;

      console.log('Updated available tokens:', newAvailableTokens);

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        data: {
          ...response[0],
          newAvailableTokens
        }
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
  const { searchParams } = new URL(request.url);
  
  try {
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Get all investments for this user with property details
    const investments = await sql`
      SELECT 
        i.*,
        p.name as property_name,
        p.location,
        p.images,
        p.expected_return,
        p.price as property_value,
        p.total_tokens as property_total_tokens
      FROM investments i
      JOIN properties p ON i.property_id = p.id
      WHERE i.user_id = ${userId}
      ORDER BY i.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      investments: investments.map(inv => ({
        id: inv.id,
        propertyId: inv.property_id,
        propertyName: inv.property_name,
        location: inv.location,
        imageUrl: inv.images[0] || '',
        amount: inv.amount,
        tokens: inv.tokens,
        txHash: inv.tx_hash,
        walletAddress: inv.wallet_address,
        createdAt: inv.created_at,
        expectedReturn: inv.expected_return,
        propertyValue: inv.property_value,
        propertyTotalTokens: inv.property_total_tokens
      }))
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
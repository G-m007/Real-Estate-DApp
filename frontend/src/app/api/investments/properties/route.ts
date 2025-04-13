import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(req: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    console.log('Fetching properties for user:', user_id);

    // Get properties where the user has invested, including their token balance
    const properties = await sql`
      WITH user_investments AS (
        SELECT 
          property_id,
          SUM(tokens) as user_tokens
        FROM investments
        WHERE user_id = ${user_id}
        GROUP BY property_id
      )
      SELECT 
        p.*,
        COALESCE(ui.user_tokens, 0) as user_tokens,
        p.price::float / p.total_tokens::float as token_value
      FROM properties p
      JOIN user_investments ui ON p.id = ui.property_id
      WHERE ui.user_tokens > 0
      ORDER BY p.created_at DESC
    `;

    console.log('Found properties:', properties);

    // Format numeric fields
    const formattedProperties = properties.map(property => ({
      ...property,
      totalValue: Number(property.price),
      totalShares: Number(property.total_tokens),
      sharesIssued: Number(property.shares_issued),
      availableTokens: Number(property.available_tokens),
      userTokens: Number(property.user_tokens),
      tokenValue: Number(property.token_value),
      expectedReturn: Number(property.expected_return)
    }));

    console.log('Formatted properties:', formattedProperties);

    return NextResponse.json({
      success: true,
      properties: formattedProperties
    });
  } catch (error: any) {
    console.error('Error fetching user properties:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch properties'
    }, { status: 500 });
  }
} 
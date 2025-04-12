import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    // Get properties from the database with user's token balance if user_id is provided
    let query = sql`
      SELECT 
        p.*,
        COALESCE(SUM(i.tokens), 0) as user_tokens
      FROM properties p
      LEFT JOIN investments i ON p.id = i.property_id AND i.user_id = ${user_id}
      WHERE p.status = 'LISTED'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const properties = await query;
    
    // Map database properties to the format expected by the frontend
    const formattedProperties = properties.map(property => ({
      id: property.id,
      name: property.name,
      location: property.location,
      imageUrl: property.images[0] || '',
      totalValue: property.price,
      totalShares: property.total_tokens,
      sharesIssued: property.total_tokens - property.available_tokens,
      availableTokens: property.available_tokens,
      active: property.status === 'LISTED',
      minInvestment: (property.price / property.total_tokens).toFixed(6),
      sharePrice: (property.price / property.total_tokens).toFixed(6),
      description: property.description,
      expectedReturn: property.expected_return,
      tokenAddress: property.token_address,
      propertyType: property.property_type,
      tokenValue: property.price / property.total_tokens,
      userTokens: Number(property.user_tokens)
    }));
    
    return NextResponse.json(
      { success: true, properties: formattedProperties },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch properties' },
      { status: 500 }
    );
  }
} 
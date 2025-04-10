import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    
    // Get properties from the database
    const properties = await sql`
      SELECT * FROM properties 
      WHERE status = 'LISTED'
      ORDER BY created_at DESC
    `;
    
    // Map database properties to the format expected by the frontend
    const formattedProperties = properties.map(property => ({
      id: property.id,
      name: property.name,
      location: property.location,
      imageUrl: property.images[0] || '',
      totalValue: property.price,
      totalShares: property.total_tokens,
      sharesIssued: property.total_tokens - property.available_tokens,
      active: property.status === 'LISTED',
      minInvestment: (property.price / property.total_tokens).toFixed(6),
      sharePrice: (property.price / property.total_tokens).toFixed(6),
      description: property.description,
      expectedReturn: property.expected_return,
      tokenAddress: property.token_address,
      propertyType: property.property_type
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
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
    
    // Get property from the database
    const properties = await sql`
      SELECT * FROM properties 
      WHERE id = ${id}
    `;
    
    if (properties.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      );
    }
    
    const property = properties[0];
    
    // Format the property for the frontend
    const formattedProperty = {
      id: property.id,
      name: property.name,
      location: property.location,
      imageUrl: property.images[0] || '',
      images: property.images || [],
      totalValue: property.price,
      totalShares: property.total_tokens,
      sharesIssued: property.total_tokens - property.available_tokens,
      active: property.status === 'LISTED',
      minInvestment: (property.price / property.total_tokens).toFixed(6),
      sharePrice: (property.price / property.total_tokens).toFixed(6),
      description: property.description,
      expectedReturn: property.expected_return,
      tokenAddress: property.token_address,
      propertyType: property.property_type,
      availableTokens: property.available_tokens
    };
    
    return NextResponse.json(
      { success: true, property: formattedProperty },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching property details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch property details' },
      { status: 500 }
    );
  }
} 
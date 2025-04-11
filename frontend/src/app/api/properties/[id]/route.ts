import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// GET /api/properties/[id] - Get a single property
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    // Get the ID from the URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 });
    }

    const property = await sql`
      SELECT * FROM properties 
      WHERE id = ${id}
    `;

    if (!property || property.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Property not found'
      }, { status: 404 });
    }

    // Format the property for the frontend
    const formattedProperty = {
      id: property[0].id,
      name: property[0].name,
      location: property[0].location,
      imageUrl: property[0].images[0] || '',
      images: property[0].images || [],
      totalValue: property[0].price,
      totalShares: property[0].total_tokens,
      sharesIssued: property[0].total_tokens - property[0].available_tokens,
      active: property[0].status === 'LISTED',
      minInvestment: (property[0].price / property[0].total_tokens).toFixed(6),
      sharePrice: (property[0].price / property[0].total_tokens).toFixed(6),
      description: property[0].description,
      expectedReturn: property[0].expected_return,
      tokenAddress: property[0].token_address,
      propertyType: property[0].property_type,
      availableTokens: property[0].available_tokens
    };

    return NextResponse.json({
      success: true,
      property: formattedProperty
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch property',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// PATCH /api/properties/[id] - Update a property
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    const id = params.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 });
    }

    // Validate required fields
    if (body.available_tokens === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Available tokens is required'
      }, { status: 400 });
    }

    try {
      // Update property
      const updatedProperty = await sql`
        UPDATE properties 
        SET available_tokens = ${body.available_tokens}
        WHERE id = ${id}
        RETURNING *
      `;

      if (!updatedProperty || updatedProperty.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Property not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: updatedProperty[0]
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating property:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update property',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 
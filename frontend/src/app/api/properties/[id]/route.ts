import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// GET /api/properties/[id] - Get a single property
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 });
    }

    // Get property with total invested tokens
    const property = await sql`
      WITH investment_totals AS (
        SELECT 
          property_id,
          SUM(tokens) as total_invested_tokens
        FROM investments
        GROUP BY property_id
      )
      SELECT 
        p.*,
        COALESCE(it.total_invested_tokens, 0) as shares_issued,
        (p.total_tokens - COALESCE(it.total_invested_tokens, 0)) as available_tokens,
        CAST((p.price / p.total_tokens) AS NUMERIC) as token_value
      FROM properties p
      LEFT JOIN investment_totals it ON p.id = it.property_id
      WHERE p.id = ${id}::uuid
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
      totalValue: Number(property[0].price),
      totalShares: Number(property[0].total_tokens),
      sharesIssued: Number(property[0].shares_issued),
      availableTokens: Number(property[0].available_tokens),
      active: property[0].status === 'LISTED',
      minInvestment: (Number(property[0].price) / Number(property[0].total_tokens)).toFixed(6),
      sharePrice: (Number(property[0].price) / Number(property[0].total_tokens)).toFixed(6),
      description: property[0].description,
      expectedReturn: Number(property[0].expected_return),
      tokenAddress: property[0].token_address,
      propertyType: property[0].property_type,
      tokenValue: Number(property[0].token_value)
    };

    return NextResponse.json({
      success: true,
      property: formattedProperty
    });

  } catch (error: any) {
    console.error('Error fetching property:', error);
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
        WHERE id = ${id}::uuid
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
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL!);
  const { searchParams } = new URL(request.url);
  
  try {
    const propertyId = searchParams.get('property_id');
    const userId = searchParams.get('user_id');

    if (!propertyId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Property ID and User ID are required'
      }, { status: 400 });
    }

    // Get all transactions for this property and user
    const transactions = await sql`
      SELECT 
        i.*,
        p.name as property_name,
        p.location,
        p.images,
        p.expected_return,
        p.price as property_value
      FROM investments i
      JOIN properties p ON i.property_id = p.id
      WHERE i.property_id = ${propertyId}::uuid
      AND i.user_id = ${userId}
      ORDER BY i.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      transactions: transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        tokens: tx.tokens,
        txHash: tx.tx_hash,
        walletAddress: tx.wallet_address,
        createdAt: tx.created_at,
        propertyName: tx.property_name,
        location: tx.location,
        imageUrl: tx.images[0] || '',
        expectedReturn: tx.expected_return,
        propertyValue: tx.property_value
      }))
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch transactions',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 
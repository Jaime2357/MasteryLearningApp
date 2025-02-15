import { NextResponse } from 'next/server';
import db from '../../lib/db'; // Adjust the path to your database connection file

// Handle GET requests
export async function GET() {
  try {
    const { rows } = await db.query('SELECT * FROM assignments'); // Example query
    return NextResponse.json(rows); // Return the data as JSON
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
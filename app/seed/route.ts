import bcrypt from "bcrypt";
import postgres from "postgres";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

export async function GET() {
	try {
		await sql.begin(async (txn) => {
			// Create extension
			await txn`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

			// Create tables
			await txn`
				CREATE TABLE IF NOT EXISTS users (
					id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					email TEXT NOT NULL UNIQUE,
					password TEXT NOT NULL
				);
			`;

			await txn`
				CREATE TABLE IF NOT EXISTS customers (
					id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					email VARCHAR(255) NOT NULL,
					image_url VARCHAR(255) NOT NULL
				);
			`;

			await txn`
				CREATE TABLE IF NOT EXISTS invoices (
					id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
					customer_id UUID NOT NULL,
					amount INT NOT NULL,
					status VARCHAR(255) NOT NULL,
					date DATE NOT NULL
				);
			`;

			await txn`
				CREATE TABLE IF NOT EXISTS revenue (
					month VARCHAR(4) NOT NULL UNIQUE,
					revenue INT NOT NULL
				);
			`;

			// Seed users
			console.log("Seeding users...");
			for (const user of users) {
				const hashedPassword = await bcrypt.hash(user.password, 10);
				await txn`
					INSERT INTO users (id, name, email, password)
					VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
					ON CONFLICT (id) DO NOTHING;
				`;
			}

			// Seed customers
			console.log("Seeding customers...");
			for (const customer of customers) {
				await txn`
					INSERT INTO customers (id, name, email, image_url)
					VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
					ON CONFLICT (id) DO NOTHING;
				`;
			}

			// Seed invoices
			console.log("Seeding invoices...");
			for (const invoice of invoices) {
				await txn`
					INSERT INTO invoices (customer_id, amount, status, date)
					VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
					ON CONFLICT (id) DO NOTHING;
				`;
			}

			// Seed revenue
			console.log("Seeding revenue...");
			for (const rev of revenue) {
				await txn`
					INSERT INTO revenue (month, revenue)
					VALUES (${rev.month}, ${rev.revenue})
					ON CONFLICT (month) DO NOTHING;
				`;
			}

			console.log("All seeding completed successfully");
		});

		return Response.json({ message: "Database seeded successfully" });
	} catch (error) {
		console.error("Seeding error:", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

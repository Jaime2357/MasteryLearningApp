import { Form, Input, Label, Text, TextField, Button } from "@/components/react-aria";
import { login } from './actions'
import Link from "next/link";

export default function LoginPage() {
	return (
		<main className="flex h-screen bg-lime-50">
			<div className="m-auto px-16 py-20 rounded-xl border bg-white">
				<h1 className="text-3xl font-mono font-bold">Mastery Learning</h1>
				<Form className="mt-12" action={login}>
					<TextField type="email" name="email">
						<Label className="text-sm">Email</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					{/* {searchParams?.error && (
						<p className="text-red-500 text-center mb-2">Please enure your email is verified</p>
					)} */}
					<TextField type="password" name="password" className={"mt-2"}>
						<Label className="text-sm">Password</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					{/* {searchParams?.error && (
							<p className="text-red-500 text-center mb-2">{searchParams?.error}</p>
					)} */}
					<Button type="submit" className="w-full border rounded-lg p-2 mt-8 cursor-pointer bg-lime-50 transition ease-in-out hover:scale-105 active:bg-gray-300 outline-lime-300 focus-visible:outline-2">
						Login
					</Button>
					<Link
						href="/signup/student"
						className="block text-center w-full border rounded-lg p-2 mt-4 cursor-pointer bg-lime-300 transition ease-in-out hover:scale-110 active:bg-gray-300 outline-lime-300 focus-visible:outline-2"
					>
						Student Sign Up
					</Link>
					<Link
						href="/signup/instructor"
						className="block text-center w-full border rounded-lg p-2 mt-4 cursor-pointer bg-lime-300 transition ease-in-out hover:scale-110 active:bg-gray-300 outline-lime-300 focus-visible:outline-2"
					>
						Instructor Sign Up
					</Link>
				</Form>
			</div>
		</main>

	)
}
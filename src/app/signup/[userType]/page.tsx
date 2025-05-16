import { Form, Input, Label, Text, TextField, Button } from "@/components/react-aria";
import { createStudent, createInstructor } from './actions'
import Link from "next/link";

type SignUpParams = { userType: string};

interface PageProps {
  params: Promise<SignUpParams>
}

export default async function SignupPage({ params }: PageProps) {

    const userType = await params;
    let action;
    let typeName

    if(userType.userType === 'student'){
        action = createStudent
        typeName = 'Student'
    }
    else{
        action = createInstructor
        typeName = 'Instructor'
    }

	return (
		<main className="flex h-screen bg-lime-50">
			<div className="m-auto px-16 py-20 rounded-xl border bg-white">
				<h1 className="text-3xl font-mono font-bold">Mastery Learning</h1>
				<Form action={action} className="mt-12">
					<TextField type="email" name="email">
						<Label className="text-sm">Email</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					<TextField type="password" name="password" className={"mt-2"}>
						<Label className="text-sm">Password</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
                    <TextField type="text" name="id">
						<Label className="text-sm"> {typeName} ID</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
                    <TextField type="text" name="fname">
						<Label className="text-sm">First Name</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
                    <TextField type="text" name="lname">
						<Label className="text-sm">Last Name</Label>
						<Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					<Button type="submit" className="w-full border rounded-lg p-2 mt-8 cursor-pointer bg-lime-50 transition ease-in-out hover:scale-105 active:bg-gray-300 outline-lime-300 focus-visible:outline-2">
						Signup
					</Button>
					<Link
						href="/login"
						className="block text-center w-full border rounded-lg p-2 mt-4 cursor-pointer bg-lime-300 transition ease-in-out hover:scale-110 active:bg-gray-300 outline-lime-300 focus-visible:outline-2"
					>
						Login
					</Link>
				</Form>
			</div>
		</main>

	)
}
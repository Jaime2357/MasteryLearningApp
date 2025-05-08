import { Form, Input, Label, Text, TextField, Button } from "@/components/react-aria";
import { login, signup } from './actions'

export default function LoginPage() {
	return (
		<main className="flex h-screen bg-lime-50">
			<div className="m-auto px-16 py-20 rounded-xl outline bg-white">
				<h1 className="text-3xl font-mono font-bold">Mastery Learning</h1>
				<Form className="flex flex-col mt-12">
					<TextField type="email" name="email" className="">
						<Label className="block text-sm">Email</Label>
						<Input className="w-full outline pl-3 py-1 mt-1 rounded-lg focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					<TextField type="password" name="password" className="mt-2">
						<Label className="block text-sm">Password</Label>
						<Input className="w-full outline pl-3 py-1 mt-1 rounded-lg focus:outline-2 bg-gray-200" />
						<Text slot="description">
						</Text>
					</TextField>
					<Button formAction={login} type="submit" className="w-full outline rounded-lg p-2 mt-8 cursor-pointer bg-lime-50 transition ease-in-out hover:scale-105 active:bg-gray-400 focus:outline-2">
						Login
					</Button>
					<Button onClick={signup} type="button" value='redirect' className="w-full outline rounded-lg p-2 mt-4 cursor-pointer bg-lime-300 transition ease-in-out hover:scale-110 active:bg-gray-400 focus:outline-2">
						Sign Up
					</Button>
				</Form>
			</div>
		</main>

	)
}
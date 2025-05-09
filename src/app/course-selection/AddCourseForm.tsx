"use client"

import { Form, TextField, Label, Input, Button, Text } from "@/components/react-aria"
import { addCourse } from "./actions"
import { useActionState } from "react"

const AddCourseForm = () => {
	const [{ errors }, formAction, pending] = useActionState(addCourse, { errors: {} });

	return (
		<>
			<h2 className="mt-8 text-2xl font-bold">Add Course</h2>
			<p>Your instructor will provide you a 5-digit code.</p>
			<Form action={formAction} className="mt-3">
				<TextField name="enrollmentCode">
					<Label className="block text-sm">Enrollment Code</Label>
					<Input minLength={5} maxLength={5} required={true} className="outline pl-3 py-1 mt-1 rounded-lg focus:outline-2 bg-gray-200" />
					<Button type="submit" isDisabled={pending} className={"data-[disabled]:hidden h-fit outline rounded-lg ml-2 px-2 py-1 cursor-pointer bg-lime-50 transition ease-in-out hover:scale-105 active:bg-gray-400 focus:outline-2"}>Enroll</Button>
					<Text slot="errorMessage" className="block text-sm text-red-500">{errors.enrollmentCode}</Text>
				</TextField>
			</Form>
		</>
	)
}

export default AddCourseForm
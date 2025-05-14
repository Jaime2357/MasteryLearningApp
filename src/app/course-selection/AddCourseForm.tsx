"use client"

import { Form, TextField, Label, Input, Button, Text } from "@/components/react-aria"
import { addCourse } from "./actions"
import { useActionState } from "react"

const AddCourseForm = () => {
	const [{ errors }, formAction, pending] = useActionState(addCourse, { errors: {} });

	return (
		<>
			<h2 className="mt-8 text-xl font-semibold">Add Course</h2>
			<p>Your instructor will provide you a 5-digit code.</p>
			<Form action={formAction} className="mt-3">
				<TextField name="enrollmentCode">
					<Label className="block text-sm">Enrollment Code</Label>
					<Input minLength={5} maxLength={5} required={true} className="border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
					<Button type="submit" isDisabled={pending} className={"data-[disabled]:hidden h-fit border rounded-lg ml-2 px-4 py-1 cursor-pointer bg-lime-50 hover:bg-lime-300 outline-lime-300 focus-visible:outline-2 active:bg-gray-300"}>Enroll</Button>
					<Text slot="errorMessage" className="block text-sm text-red-500">{errors.enrollmentCode}</Text>
				</TextField>
			</Form>
		</>
	)
}

export default AddCourseForm
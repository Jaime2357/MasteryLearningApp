"use client"

import { Form, TextField, Label, Input, Button, Text, FieldError } from "@/components/react-aria"
import { addCourse } from "./actions"
import { useActionState } from "react"

const AddCourseForm = () => {
	const [{ errors }, formAction, pending] = useActionState(addCourse, { errors: {} });

	return (
		<Form action={formAction}>
			<TextField name="enrollmentCode">
				<Label>Enrollment Code</Label>
				<Input minLength={5} maxLength={5} required={true} />
				<Text slot="description">
					Your instructor will provide an enrollment code with 5 characters.
				</Text>
			</TextField>
			<Button type="submit" isDisabled={pending} className={"data-[disabled]:hidden"}>Add Course</Button>
		</Form>
	)
}

export default AddCourseForm
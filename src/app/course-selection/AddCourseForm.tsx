"use client"

import { Form, TextField, Label, Input, Button, Text } from "@/components/react-aria"
import { addCourse } from "./actions"
import { useActionState } from "react"

const AddCourseForm = () => {
	const [{ errors }, formAction, pending] = useActionState(addCourse, { errors: {} });

	return (
		<Form action={formAction} validationErrors={errors} className="mt-8">
			<TextField name="enrollmentCode">
				<Label>Enrollment Code</Label>
				<Input minLength={5} maxLength={5} required={true} />
				<Text slot="description">
					Ask your instructor for an enrollment code.
				</Text>
				<Text slot="errorMessage">{errors.enrollmentCode}</Text>
			</TextField>
			<Button type="submit" isDisabled={pending} className={"data-[disabled]:hidden"}>Add Course</Button>
		</Form>
	)
}

export default AddCourseForm
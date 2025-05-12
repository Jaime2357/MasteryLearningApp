"use server"

import { createClient } from "@/utils/supabase/server";
import { type ValidationErrors } from "@react-types/shared";
import { redirect } from "next/navigation";

interface FormState {
	errors: ValidationErrors;
}

export const addCourse = async (formState: FormState, formData: FormData): Promise<FormState> => {

	const enrollmentCodeInput: number = Number(formData.get("enrollmentCode"));
	if (!Number.isInteger(enrollmentCodeInput)) {
		return { errors: { enrollmentCode: "Invalid enrollment code." } };
	}

	const supabase = await createClient();
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect('/login')
	}

	const { data: id } = await supabase.from('students').select('student_id').eq('system_id', data.user.id).single();

	const { data: courseId, error: courseIdError } = await supabase
		.from('courses')
		.select('course_id')
		.eq('enrollment_code', enrollmentCodeInput)
		.single();

	if (courseIdError) {
		if (courseIdError.message === 'JSON object requested, multiple (or no) rows returned') {
			return { errors: { enrollmentCode: "No matching course found." } };
		}
		else {
			return { errors: { enrollmentCode: "Problem searching for course." } };
		}
	}
	else {
		const { data: enrollmentCheck, error: enrollmentCheckError } = await supabase
			.from('course_enrollments')
			.select()
			.eq('student_id', id)
			.eq('course_id', courseId.course_id);

		console.log('Student ID: ', id)
		console.log('Course ID: ', courseId.course_id)
		console.log(enrollmentCheck)

		if (enrollmentCheckError) {
			return { errors: { enrollmentCode: "Problem checking enrollments." } };
		}

		if (enrollmentCheck.length > 0) {
			return { errors: { enrollmentCode: "You are already enrolled in this course." } };
		}

		const newEnrollment = {
			student_id: id?.student_id,
			course_id: courseId.course_id
		}

		const { error: enrollmentError } = await supabase
			.from('course_enrollments')
			.insert([newEnrollment])

		if (enrollmentError) {
			console.error('Error:', enrollmentError.message)
			return { errors: { enrollmentCode: "Problem enrolling in course." } };
		}

		redirect(`/student-dashboard/${courseId.course_id}`);
	}
}

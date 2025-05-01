import React from "react";
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'
import CourseSelectionComponent from "./components/courseSelectionClient";
import { Button } from "@/components/react-aria";
import { logout } from "../actions";

interface Instructor {
	instructor_id: string;
	first_name: string;
	last_name: string;
}

export default async function CourseSelection() {

	// Create Supabase Client
	const supabase = await createClient();

	// Obtain User Credentials from Session JWT, redirect if login is not detected
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect('/login')
	}

	// User's Student or Intructor ID
	let id: string = '';
	let instructor = false;

	//Get User's ID and associated course IDs
	const { data: instructor_id } = await supabase.from('instructors').select('instructor_id').eq('system_id', data.user.id).single();
	if (!instructor_id) {
		const { data: student_id } = await supabase.from('students').select('student_id').eq('system_id', data.user.id).single();
		if (!student_id) {
			return (
				<div>
					<p> No matching student or instructor ID found </p>
				</div>
			)
		}
		else {
			id = student_id.student_id;
		}
	}
	else {
		id = instructor_id.instructor_id;
		instructor = true;
	}

	let courseIds: number[];
	let courses;

	// Retrieved Courses
	if (instructor) {
		console.log(id)
		const { data: retrievedCourses, error: courseError } = await supabase.from('courses').select().eq('instructor_id', id);
		if (courseError) {
			console.log("Error Retrieving Courses: ", courseError.message)
			return null;
		}
		courses = retrievedCourses;
	}
	else {
		const { data: course_ids, error: courseIdError } = await supabase.from('course_enrollments').select('course_id').eq('student_id', id);
		if (courseIdError) {
			console.log("Error Retrieving Course IDs: ", courseIdError.message)
			return null;
		}
		courseIds = course_ids.map(courseID => courseID.course_id);
		const { data: retrievedCourses } = await supabase.from("courses").select().in('course_id', courseIds);
		courses = retrievedCourses;
	}

	if (!courses) { // If courseID does not exist (Should not happen as there is a foreign key constraint)
		console.error("No Courses Found...")
		return null;
	}

	let instructorMap: Map<string, Instructor> = new Map();

	if (!instructor) {

		const instructorIds = courses.map(course => course.instructor_id);

		const { data: instructors, error: instructorError } = await supabase.from("instructors").select().in('instructor_id', instructorIds);

		if (instructorError) { // If no matching instructors are found (Should not happen as there is a foreign key + unique constraint)
			console.error("No Instructors Found...")
			return null;
		}

		instructorMap = new Map(instructors.map(instructor => [instructor.instructor_id, instructor]));

	}

	return (
		<>
			<nav className="p-8">
				<ul className="flex justify-end">
					<li>
						<Button onPress={logout} className="cursor-pointer text-gray-600 hover:underline focus:underline focus:outline-0">
							Sign Out
						</Button>
					</li>
				</ul>
			</nav>
			<main>
				<CourseSelectionComponent
					id={id}
					instructor={instructor}
					instructors={instructorMap}
					courses={courses}

				/>
			</main>
		</>
	)

}
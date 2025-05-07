import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'
import { Button } from "@/components/react-aria";
import { logout } from "../actions";
import Link from "next/link";
import AddCourseForm from "./AddCourseForm";

interface Instructor {
	instructor_id: string;
	first_name: string;
	last_name: string;
}

const CourseSelection = async () => {

	// Create Supabase Client
	const supabase = await createClient();

	// Obtain User Credentials from Session JWT, redirect if login is not detected
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect('/login')
	}

	// User's Student or Intructor ID
	let id: string = '';
	let instructor: boolean = false;

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
			return;
		}
		courses = retrievedCourses;
	}
	else {
		const { data: course_ids, error: courseIdError } = await supabase.from('course_enrollments').select('course_id').eq('student_id', id);
		if (courseIdError) {
			console.log("Error Retrieving Course IDs: ", courseIdError.message)
			return;
		}
		courseIds = course_ids.map(courseID => courseID.course_id);
		const { data: retrievedCourses } = await supabase.from("courses").select().in('course_id', courseIds);
		courses = retrievedCourses;
	}

	if (!courses) { // If courseID does not exist (Should not happen as there is a foreign key constraint)
		console.error("No Courses Found...")
		return;
	}

	let instructorMap: Map<string, Instructor> = new Map();

	if (!instructor) {

		const instructorIds = courses.map(course => course.instructor_id);

		const { data: instructors, error: instructorError } = await supabase.from("instructors").select().in('instructor_id', instructorIds);

		if (instructorError) { // If no matching instructors are found (Should not happen as there is a foreign key + unique constraint)
			console.error("No Instructors Found...")
			return;
		}

		instructorMap = new Map(instructors.map(instructor => [instructor.instructor_id, instructor]));

	}

	const getInstructor = (instructor_id: string) => {
		return instructorMap.get(instructor_id);
	}

	return (
		<>
			{/* Navbar */}
			<nav className="px-8 pt-6 pb-4 border-b grid grid-cols-4 bg-lime-300">
				<Link href="/" className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">Mastery Learning</Link>
				<Button onPress={logout} className="justify-self-end cursor-pointer text-sm hover:underline focus:underline focus:outline-0">
					Sign Out
				</Button>
			</nav>
			<main className="mx-12 mt-12">
				{/* Instructor Course Selection */}
				{instructor &&
					<div>
						<h1> Courses: </h1>
						<ul>
							{courses.map((course, index) => (
								<li key={course.course_id || index}>
									<Link href={`/instructor-dashboard/${course.course_id}`}>
										({course.course_id}) {course.catalog_code}: {course.course_name}
										<br />
									</Link>
								</li>
							))}
						</ul>
						<Link href={`/my-questions/${id}`}> My Questions </Link>
						<Link href={`/course-creator`}> Create Course </Link>
						<p> ------------------------------------------</p>
					</div>
				}
				{/* Student Course Selection */}
				{!instructor &&
					<>
						<h1 className="text-3xl font-bold">Courses:</h1>
						<ul className="mt-5 flex gap-8">
							{courses.map((course, index) => {
								const instructor = getInstructor(course.instructor_id);
								return (
									<li key={course.course_id || index} className="border rounded-lg">
										<Link href={`/student-dashboard/${course.course_id}`}>
											({course.course_id}) {course.catalog_code}: {course.course_name}
											<br />
											Instructor: {instructor
												? `${instructor.first_name} ${instructor.last_name}`
												: "Unknown Instructor"}
										</Link>
									</li>
								);
							})}
						</ul>
						{/* Student Course Enrollment */}
						<AddCourseForm />
					</>
				}
			</main>
		</>
	)

}

export default CourseSelection;
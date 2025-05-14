import { logout } from "@/app/actions";
import { Button, Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/react-aria";
import { createClient } from '@/utils/supabase/server';
import { ChevronLeft } from "lucide-react";
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Submission = {
	submission_id: number;
	assignment_id: number;
	blocks_complete: number;
	finished: boolean;
};

type CourseParams = { course_id: string };

export default async function StudentDashboard({ params }: { params: CourseParams }) {

	const supabase = await createClient();

	const { data: userData, error: authError } = await supabase.auth.getUser();
	if (authError || !userData?.user) {
		redirect('/login');
	}

	const { data: student_id, error: idError } = await supabase
		.from('students')
		.select('student_id')
		.eq('system_id', userData.user.id)
		.single();

	if (idError) {
		console.error("Authentication Error: ", idError.message)
	}

	const { course_id } = await params;

	console.log(course_id)

	// Fetch course information
	const { data: course, error: courseError } = await supabase
		.from('courses')
		.select('course_name, catalog_code')
		.eq('course_id', course_id)
		.single();

	if (courseError || !course) {
		console.error("Error fetching course information: ", courseError.message);
		return;
	}

	// Fetch assignments
	const { data: assignments, error: assignmentError } = await supabase
		.from('assignments_list')
		.select('assignment_id, assignment_name, due_date, block_count')
		.eq('course_id', course_id)
		.eq('open', true);

	if (assignmentError) {
		console.error("Error Retrieving Assignments: ", assignmentError.message)
		return;
	}

	const assignmentIds = assignments.map(a => a.assignment_id);

	// Fetch submissions
	const { data: submissions, error: submissionError } = await supabase
		.from('student_submissions')
		.select('submission_id, assignment_id, blocks_complete, finished')
		.eq('student_id', student_id?.student_id)
		.in('assignment_id', assignmentIds);

	if (submissionError) {
		console.error("Problem retrieving submissions: ", submissionError.message);
		return;
	}

	console.log(submissions)

	// Map assignments to their corresponding submissions
	const mappedAssignments = await Promise.all(
		assignments.map(async (assignment) => {
			const correspondingSubmission = submissions.find(
				(submission) => submission.assignment_id === assignment.assignment_id
			);

			if (!correspondingSubmission) {
				return { ...assignment, submission: await createSubmission(assignment.assignment_id) };
			} else {
				return { ...assignment, submission: correspondingSubmission };
			}
		})
	);


	async function createSubmission(assignment_id: number): Promise<Submission | null> {

		const newSubmissionData = {
			student_id: student_id?.student_id,
			assignment_id: assignment_id,
			blocks_complete: 0, // Explicitly set default value
			finished: false,    // Explicitly set default value
		};

		const { data: newSubmission, error: newSubmissionError } = await supabase
			.from('student_submissions')
			.insert([newSubmissionData])
			.select("*")
			.single()


		if (newSubmissionError) {
			console.error("Problem Creating Submission: ", newSubmissionError);
			return null;
		}

		return newSubmission[0];
	}

	// Assignment Completion Helper Function
	function getPercentage(question_count: number, questions_complete: number) {
		const completion = 100 * (questions_complete / question_count);
		return completion.toFixed(2) + "%";
	}

	return (
		<>
			{/* Navbar */}
			<header className="px-8 pt-6 pb-4 border-b bg-lime-300">
				<nav className="grid grid-cols-4">
					<Link href="/" className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">Mastery Learning</Link>
					<Button onPress={logout} className="justify-self-end cursor-pointer text-sm hover:underline focus-visible:underline outline-none">
						Sign Out
					</Button>
				</nav>
			</header>
			{/* Back to Course Selection */}
			<Link href="/course-selection" className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
				<ChevronLeft className="inline" strokeWidth={1} />
				<span className="align-middle group-hover:underline group-focus-visible:underline">Return to Course Selection</span>
			</Link>
			<main className="mx-12 mt-6">
				<h1 className="text-3xl font-bold">{`${course.catalog_code}: ${course.course_name}`}</h1>
				<Table
					aria-label="assignments"
					className="mt-6 min-w-md max-w-4xl w-full table-fixed"
				>
					<TableHeader className="text-left text-sm border-b">
						<Column isRowHeader className="pl-4 py-2 w-2/5 font-semibold">Assignment</Column>
						<Column className="font-semibold">Progress</Column>
						<Column className="font-semibold">Due Date</Column>
						<Column className="font-semibold">Status</Column>
					</TableHeader>
					<TableBody>
						{mappedAssignments.map(assignment =>
							<Row
								key={assignment.assignment_id}
								href={`../question-page/${course_id}/${assignment.assignment_id}`}
								className="hover:bg-lime-50 cursor-pointer focus-within:bg-lime-50 active:bg-lime-300 border-b border-gray-400"
							>
								<Cell className="pl-4 py-4"><h2 className="truncate">{assignment.assignment_name}</h2></Cell>
								<Cell>{getPercentage(assignment.block_count, assignment.submission?.blocks_complete ?? 0)}</Cell>
								<Cell>{new Date(assignment.due_date).toLocaleDateString()}</Cell>
								<Cell>{
									assignment.submission?.finished ? 'Finished' : 'In Progress'
								}</Cell>
							</Row>
						)}
					</TableBody>
				</Table>
			</main>
		</>
	);
}

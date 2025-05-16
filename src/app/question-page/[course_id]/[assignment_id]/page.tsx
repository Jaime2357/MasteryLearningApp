import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AssignmentComponent from './components/assignmentClient';

type AssignmentParams = { course_id: string, assignment_id: string };

interface PageProps {
  params: Promise<AssignmentParams>
}

export default async function QuestionPage({ params }: PageProps) {
	const supabase = await createClient();

	// Authenticate user
	const { data: userData, error: authError } = await supabase.auth.getUser();
	if (authError || !userData?.user) {
		redirect('/login');
	}

	// Get student ID
	const { data: studentId } = await supabase.from('students').select('student_id').eq('system_id', userData.user.id).single();
	if (!studentId) {
		return (
			<div>
				<p> UH OH </p>
			</div>
		);
	}

	const { course_id, assignment_id } = await params;

	// Fetch assignment name
	const { data: assignmentName } = await supabase.from("assignments_list").select('assignment_name').eq('assignment_id', assignment_id).single();
	if (!assignmentName) {
		return <div> Error Retrieving Assignment </div>;
	}

	// Fetch question blocks
	const { data: blocks } = await supabase.from("question_blocks").select().eq('assignment_id', assignment_id);

	if (!blocks || blocks.length < 1) {
		return <div> Error Retrieving Blocks </div>;
	}

	// Pass data to client component
	return (
		<AssignmentComponent
			assignmentId={assignment_id}
			assignmentName={assignmentName}
			blocks={blocks}
			studentId={studentId.student_id}
			courseId={course_id}
		/>

	);
}

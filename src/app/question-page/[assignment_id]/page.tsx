import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ClientComponent from '@/components/assignmentClient';

type AssignmentParams = { assignment_id: string };

export default async function QuestionPage({ params }: { params: AssignmentParams }) {
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

    const { assignment_id } = await params;

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

    const { data: submissionData } = await supabase
        .from("student_submissions")
        .select('submission_id')
        .eq('assignment_id', assignment_id)
        .eq('student_id', studentId.student_id)
        .single();

    if (!submissionData) {
        return <div> Error Retrieving Submissions </div>;
    }

    const submission_id: number = submissionData.submission_id;


    // Pass data to client component
    return (
        <ClientComponent
            assignmentId={assignment_id}
            assignmentName={assignmentName}
            blocks={blocks}
            submissionId={submission_id}
            studentId={studentId.student_id}
        />
    );
}

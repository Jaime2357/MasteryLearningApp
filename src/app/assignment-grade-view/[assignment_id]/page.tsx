import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

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

    // Fetch block IDs for Assignment
    const { data: blockIds } = await supabase
        .from("question_blocks")
        .select('block_id')
        .eq('assignment_id', assignment_id);

    if (!blockIds) {
        return <div> Error Retrieving BlockIDs </div>;
    }

    // Fetch submission blocks associated with user and assignment
    const { data: submissionBlocks } = await supabase
        .from("block_submissions")
        .select()
        .in('block_id', blockIds);

    if (!submissionBlocks) {
        return <div> Error Retrieving Submission Blocks </div>;
    }







    // TODO: Fetch question blocks associated with assignment
 




    // Fetch Assignment Submission Details
    const { data: assignmentSubmission } = await supabase
        .from("student_submissions")
        .select()
        .eq('assignment_id', assignment_id)
        .eq('student_id', studentId)
        .single();

    if (!assignmentSubmission) {
        return <div> Error Retrieving Assignment Submissions </div>;
    }

    const totalScore = assignmentSubmission.block_scores.reduce((a: number, b: number) => a + b, 0) / assignmentSubmission.block_scores.length;



    //TODO: Map out values






    // Pass data to client component
    return (
        <div>
            <h1> Total Score: {totalScore} </h1>
            {submissionBlocks.map((block, index) => (
                <li key={index}>
                    ({block.course_id}) {course.catalog_code}: {course.course_name}
                    <br />
                    Instructor: {getInstructor(course.instructor_id).first_name} {getInstructor(course.instructor_id).last_name}
                </li>
            ))}
        </div>
    );
}

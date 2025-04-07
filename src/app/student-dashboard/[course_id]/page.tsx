import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// type Assignment = {
//     assignment_id: number;
//     assignment_name: string;
//     due_date: string;
//     question_count: number;
// };

// type Submission = {
//     submission_id: number;
//     assignment_id: number;
//     blocks_complete: number;
//     finished: boolean;
// };

// type Course = {
//     course_name: string;
// };

type CourseParams = { course_id: string };

export default async function StudentDashboard({ params }: { params: CourseParams }) {
    const supabase = await createClient();

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
        return null; // Prevent further execution
    }

    const { course_id } = await params;

    console.log(course_id)

    // Fetch course information
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('course_name')
        .eq('course_id', course_id)
        .single();

    if (courseError || !course) {
        return <div>Error fetching course information.</div>;
    }

    // Fetch assignments
    const { data: assignments, error: assignmentError } = await supabase
        .from('assignments_list')
        .select('assignment_id, assignment_name, due_date, block_count')
        .eq('course_id', course_id)
        .eq('open', true);

    if (assignmentError || !assignments || assignments.length === 0) {
        return <div>No assignments found for this course.</div>;
    }

    // Fetch submissions
    const { data: submissions, error: submissionError } = await supabase
        .from('student_submissions')
        .select('submission_id, assignment_id, blocks_complete, finished');

    if (submissionError || !submissions || submissions.length === 0) {
        return <div>No submissions found for this course.</div>;
    }

    // Map assignments to their corresponding submissions
    const mappedAssignments = assignments.map((assignment) => {
        const correspondingSubmission = submissions.find(
            (submission) => submission.assignment_id === assignment.assignment_id
        );

        return { ...assignment, submission: correspondingSubmission };
    });

    // Assignment Completion Helper Function
    function getPercentage(question_count: number, questions_complete: number) {
        const completion = 100 * (questions_complete / question_count);
        return completion.toFixed(2);
    }

    return (
        <div>
            <Link href={`/course-selection`}> Course Selection </Link>
            <h1>{course.course_name}</h1>
            <ul>
                {mappedAssignments.map((assignment) => (
                    <li key={assignment.assignment_id}>
                        <Link href={`../question-page/${course_id}/${assignment.assignment_id}`}>
                            <h2>{assignment.assignment_name}</h2>
                        </Link>
                        <p>Due Date: {new Date(assignment.due_date).toLocaleDateString()}</p>
                        {assignment.submission ? (
                            <>
                                <p>Completion: {getPercentage(assignment.block_count, assignment.submission.blocks_complete)}</p>
                                <p>Status: {assignment.submission.finished ? 'Finished' : 'In Progress'}</p>
                            </>
                        ) : (
                            <p>No submission found</p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

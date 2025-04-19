import { createClient } from '@/utils/supabase/server';
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
        return null; // Prevent further execution
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
        .select('course_name')
        .eq('course_id', course_id)
        .single();

    if (courseError || !course) {
        console.error("Error fetching course information: ", courseError.message);
        return null;
    }

    // Fetch assignments
    const { data: assignments, error: assignmentError } = await supabase
        .from('assignments_list')
        .select('assignment_id, assignment_name, due_date, block_count')
        .eq('course_id', course_id)
        .eq('open', true);

    if (assignmentError) {
        console.error("Error Retrieving Assignments: ", assignmentError.message)
        return null;
    }

    // Fetch submissions
    const { data: submissions, error: submissionError } = await supabase
        .from('student_submissions')
        .select('submission_id, assignment_id, blocks_complete, finished');

    if (submissionError) {
        console.error("Problem retrieving submissions: ", submissionError.message);
        return null;
    }

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
            student_id: student_id,
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
        return completion.toFixed(2);
    }

    return (
        <div>
            <Link href={`/course-selection`}> Course Selection </Link>
            <h1>{course.course_name}</h1>
            {(assignments.length === 0) &&
                <p> No Assignments! </p>
            }
            {(assignments.length > 0) &&
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
            }
        </div>
    );
}

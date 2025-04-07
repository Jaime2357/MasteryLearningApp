import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type CourseParams = { course_id: string, assignment_id: number };

type Submissions = {
    submission_id: number,
    student_id: string,
    blocks_complete: number,
    block_scores: number[],
    finished: boolean,
    current_block: number,
    current_version: number
};

type Assignment = {
    assignment_name: string,
    assigned: boolean,
    open: boolean,
    due_date: Date,
    block_count: number,
    total_points: number
};

export default async function AssignmentGradeList({ params }: { params: CourseParams }) {

    const supabase = await createClient(); // Create Supabase Client
    const { course_id, assignment_id } = await params; // Extract Course ID and Assignment ID

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
        return null; // Prevent further execution
    }

    // Fetch student submissions for assignment
    const { data: assignment, error: assignmentError } = await supabase
        .from('assignments_list')
        .select('assignment_name, assigned, open, due_date, block_count, total_points')
        .eq('assignment_id', assignment_id)
        .single();

    if (assignmentError) {
        return <div>Error fetching assignment information.</div>;
    }

    // Fetch student submissions for assignment
    const { data: submissions, error: submissionsError } = await supabase
        .from('student_submissions')
        .select('submission_id, student_id, blocks_complete, block_scores, finished, current_block, current_version')
        .eq('assignment_id', assignment_id);

    if (submissionsError || !submissions) {
        return <div>Error fetching submission information.</div>;
    }

    // Fetch students enrolled
    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', course_id);

    if (enrollmentsError) {
        return <div> No student enrollments found for this course. </div>;
    }
    console.log("Assignment:", assignment)
    console.log("Enrollment:", enrollments)

    const student_ids = enrollments.map(enrollment => enrollment.student_id);


    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id, first_name, last_name')
        .in('student_id', student_ids);

    if (studentsError) {
        return <div> No students found matching the given IDs </div>;
    }

    // Map students to their submissions
    const mappedSubmissions = students.map((student) => {
        const correspondingSubmission = submissions.find(
            (submission) => submission.student_id === student.student_id
        );

        return { ...student, submission: correspondingSubmission };
    });

    // Assignment Completion Helper Function
    function getPercentage(question_count: number, questions_complete: number) {
        const completion = 100 * (questions_complete / question_count);
        return completion.toFixed(2);
    }

    // Helper Function to find each student's total score
    function getTotalScore(submission: Submissions, assignment: Assignment) {
        if (!submission.block_scores) {
            return 0;
        }
        return parseFloat(((submission.block_scores.reduce((acc: number, curr: number) => acc + curr, 0)) / assignment.total_points * 100).toFixed(2));

    }

    return (
        <div>
            <div>
                <Link href={`/instructor-dashboard/${course_id}`}> Instructor Dashboard </Link>
                <h1>Student Submissions</h1>
                <h2> {assignment.assignment_name}</h2>
                <p> {assignment.due_date}</p>
            </div>
            <div>
                <ul>
                    {mappedSubmissions.map((submission) => (
                        <li key={submission.student_id}>
                            <Link href={`/student-submission-overview/${course_id}/${submission.submission?.submission_id}`}>
                                <h2>{submission.first_name} {submission.last_name}</h2>
                            </Link>
                            {submission.submission ? (
                                <>
                                    <p>Completion: {getPercentage(assignment.block_count, submission.submission.blocks_complete)}</p>
                                    <p>Total Score: {getTotalScore(submission.submission, assignment)}</p>
                                    <p>Status: {submission.submission.finished ? 'Finished'
                                        : `In Progress (${submission.submission.blocks_complete}/${assignment.block_count} Blocks)`}</p>
                                </>
                            ) : (
                                <p> No submission found for this student</p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

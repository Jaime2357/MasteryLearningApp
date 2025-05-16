import { logout } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';
import { Button, Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/react-aria";
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type CourseParams = { course_id: string, assignment_id: number };

interface PageProps {
  params: Promise<CourseParams>
}

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

export default async function AssignmentGradeList({ params }: PageProps) {

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
    function getTotalScore(submission: Submissions | undefined, assignment: Assignment) {
        if (!submission) {
            return 0
        }
        if (!submission.block_scores) {
            return 0;
        }
        if (assignment.total_points === 0) {
            return 100;
        }
        return parseFloat(((submission.block_scores.reduce((acc: number, curr: number) => acc + curr, 0)) / assignment.total_points * 100).toFixed(2));

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
            <Link href={`/instructor-dashboard/${course_id}`} className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
                <ChevronLeft className="inline" strokeWidth={1} />
                <span className="align-middle group-hover:underline group-focus-visible:underline">Back</span>
            </Link>
            <main className="mx-12 mt-6">

                <div className="mb-4">
                    <p className="text-3xl font-bold"> {assignment.assignment_name}</p>
                    <p className="text-2xl">Submissions</p>
                    <p className="mt-2 text-lg font-semibold">Due: <span className="font-normal">
                        {new Date(assignment.due_date).toLocaleString('en-US', {
                            month: 'long',   // "May"
                            day: 'numeric',  // "5"
                            year: 'numeric', // "2025"
                            hour: 'numeric', // "11"
                            minute: '2-digit', // "59"
                            hour12: true     // "PM"
                        })}
                    </span>
                    </p>
                </div>



                <Table
                    aria-label="assignments"
                    className="my-6 min-w-md max-w-4xl w-full table-fixed"
                >
                    <TableHeader className="text-left text-sm border-b">
                        <Column isRowHeader className="pl-4 py-2 w-2/5 font-semibold">Student</Column>
                        <Column className="w-1/5 font-semibold">Completion</Column>
                        <Column className="w-1/5 font-semibold">Score</Column>
                        <Column className="w-1/5"> Status </Column>
                    </TableHeader>

                    <TableBody>
                        {mappedSubmissions.map(submission =>
                            <Row
                                key={submission.student_id}
                                href={`/student-submission-overview/${course_id}/${submission.submission?.submission_id}`}
                                className="group transition-colors hover:bg-lime-50 cursor-pointer focus-within:bg-lime-50 active:bg-lime-300 border-b border-gray-400"
                            >
                                <Cell className="pl-4 py-4">
                                    <p>{submission.first_name} {submission.last_name}</p>
                                </Cell>
                                <Cell>
                                    <p>{getPercentage(assignment.block_count, submission.submission?.blocks_complete)}%</p>
                                </Cell>
                                <Cell>
                                    <p>{getTotalScore(submission.submission, assignment)}</p>
                                </Cell>
                                <Cell>
                                    <p>
                                        {submission.submission?.finished ? 'Finished'
                                            : `In Progress (${submission.submission?.blocks_complete}/${assignment.block_count} Sets)`}
                                    </p>
                                </Cell>
                            </Row>
                        )}
                    </TableBody>
                </Table>

            </main>
        </>
    );
}

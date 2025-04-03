import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

type CourseParams = { course_id: string };

export default async function InstructorDashboard({ params }: { params: CourseParams }) {
    
    const supabase = await createClient(); // Create Supabase Client
    const { course_id } = await params; // Extract Course ID

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
        .select('assignment_id, assignment_name, due_date, assigned, open')
        .eq('course_id', course_id)
        .eq('open', true);

    if (assignmentError || !assignments || assignments.length === 0) {
        return <div>No assignments found for this course.</div>;
    }

    return (
        <div>
            <Link href={`/course-selection`}> Course Selection </Link>
            <h1>{course.course_name}</h1>
            <h2> Posted Assignments </h2>
            <ul>
                {assignments.map((assignment) => (
                    <li key={assignment.assignment_id}>
                        {/* <Link href ={`../question-page/${course_id}/${assignment.assignment_id}`}> */}
                            <h2>{assignment.assignment_name}</h2>
                        {/* </Link> */}
                        <p>Due Date: {new Date(assignment.due_date).toLocaleDateString()}</p>
                        {(assignment.assigned) && <p> Assigned </p>}
                        {(!assignment.assigned) && <p> Not Assigned </p>}
                        {(assignment.assigned) && <p> Open </p>}
                        {(!assignment.assigned) && <p> Closed </p>}
                        <Link href={`/assignment-grade-list/${course_id}/${assignment.assignment_id}`}> View Student Grades </Link>
                        {(assignment.assigned) && <p> Edit Assignment </p>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
//import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Assignment = {
    assignment_id: string,
    assignment_name: string,
    due_date: Date,
    assigned: boolean,
    open: boolean
}

type Course = {
    course_name: string,
    enrollment_code: number,
}

interface ClientComponentProps {
    course: Course;
    course_id: string;
    initialAssignments: Assignment[];
}

const InstructorDashboardComponent: React.FC<ClientComponentProps> = ({ course_id, course, initialAssignments }) => {
    const supabase = createClient();
    //const router = useRouter();

    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)

    useEffect(() => {

    }, [assignments])

    // Fetch assignments
    async function getAssignments() {
        const { data: retrievedAssignments, error: assignmentError } = await supabase
            .from('assignments_list')
            .select('assignment_id, assignment_name, due_date, assigned, open')
            .eq('course_id', course_id);

        if (assignmentError || !assignments || assignments.length === 0) {
            return <div>No assignments found for this course.</div>;
        }

        setAssignments(retrievedAssignments);
    }

    async function deleteAssignment(id: string) {
        const { error: AssignmentDeletionError } = await supabase
            .from('assignments_list')
            .delete()
            .eq('assignment_id', id)

        if (AssignmentDeletionError) {
            console.error('Problem Deleting Assignment: ', AssignmentDeletionError.message);
            return null;
        }
        else {
            getAssignments();
        }
    }

    async function setAssignedValue(val: boolean, assignmentId: string) {

        const { error: AssignedUpdateError } = await supabase
            .from('assignments_list')
            .update([{ assigned: !val }])
            .eq('assignment_id', assignmentId);

        if (AssignedUpdateError) {
            console.error('Problem Updating Assignment Status: ', AssignedUpdateError.message)
        }
        else {
            getAssignments();
        }

    }

    async function setOpenValue(val: boolean, assignmentId: string) {

        const { error: AssignedUpdateError } = await supabase
            .from('assignments_list')
            .update([{ open: !val }])
            .eq('assignment_id', assignmentId);

        if (AssignedUpdateError) {
            console.error('Problem Updating Assignment Status: ', AssignedUpdateError.message)
        }
        else {
            getAssignments();
        }

    }

    return (
        <div>
            <Link href={`/course-selection`}> &lt;- Course Selection </Link>
            <p> -- </p>

            <h1>{course.course_name}</h1>
            <p> Enrollment Code: {course.enrollment_code}</p>
            <p> -----</p>

            <h2> Posted Assignments </h2>
            <p> ------------------------------------------</p>

            <ul>
                {assignments.map((assignment) => (
                    <li key={assignment.assignment_id}>
                        {/* <Link href ={`../question-page/${course_id}/${assignment.assignment_id}`}> */}
                        <h2>{assignment.assignment_name}</h2>
                        {/* </Link> */}
                        <p>Due Date: {new Date(assignment.due_date).toLocaleDateString()}</p>
                        <button onClick={() => setOpenValue(assignment.open, assignment.assignment_id)}>
                            {(assignment.open) && <p> Open </p>}
                            {(!assignment.open) && <p> Closed </p>}
                        </button>

                        <button onClick={() => setAssignedValue(assignment.assigned, assignment.assignment_id)}>
                            {(assignment.assigned) && <p> Assigned </p>}
                            {(!assignment.assigned) && <p> Not Assigned </p>}
                        </button>

                        <Link href={`/assignment-preview/${course_id}/${assignment.assignment_id}`}> View Assignment </Link>
                        <br></br>
                        <Link href={`/assignment-grade-list/${course_id}/${assignment.assignment_id}`}> View Student Grades </Link>
                        <Link href={`/assignment-editor/${course_id}/${assignment.assignment_id}`}> Edit Assignment </Link>
                        <button onClick={() => deleteAssignment(assignment.assignment_id)}> Delete Assignment </button>
                        <p> ------------------------------------------</p>
                    </li>
                ))}
            </ul>
            <Link href={`/assignment-editor/${course_id}`}> Create Assignment </Link>
        </div>
    );
}
export default InstructorDashboardComponent;

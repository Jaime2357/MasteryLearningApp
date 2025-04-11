'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type Assignment = {
    assignment_id: string,
    assignment_name: string,
    due_date: Date,
    assigned: boolean,
    open: boolean,
    assigned_date: Date | null,
    open_date: Date | null,
    close_date: Date | null,
    open_override: boolean
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
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);

    // Only add auto-refresh if needed
    useEffect(() => {
        const interval = setInterval(getAssignments, 60000);
        return () => clearInterval(interval);
    }, []);

    async function getAssignments() {
        const { data: retrievedAssignments, error } = await supabase
            .from('assignments_list')
            .select(`
                assignment_id, 
                assignment_name, 
                due_date, 
                assigned, 
                open,
                assigned_date,
                open_date,
                close_date,
                open_override
            `)
            .eq('course_id', course_id);

        if (!error && retrievedAssignments) setAssignments(retrievedAssignments);
    }

    // Modified toggle handlers
    async function setAssignedValue(val: boolean, assignmentId: string) {
        const assignment = assignments.find(a => a.assignment_id === assignmentId);
        if (!assignment) return;

        // Prevent unassigning if auto-assigned by date
        if (assignment.assigned && assignment.assigned_date && new Date() >= assignment.assigned_date) {
            alert("Assignment is auto-assigned based on schedule");
            return;
        }

        const { error } = await supabase
            .from('assignments_list')
            .update({ assigned: !val })
            .eq('assignment_id', assignmentId);

        if (!error) getAssignments();
    }

    async function setOpenValue(val: boolean, assignmentId: string) {
        // Always set override when manually toggling
        const { error } = await supabase
            .from('assignments_list')
            .update([{
                open: !val,
                open_override: true
            }])
            .eq('assignment_id', assignmentId);

        if (!error) getAssignments();
    }

    // Helper for auto-assigned state
    const isAutoAssigned = (assignment: Assignment) => {
        return !!assignment.assigned_date && new Date() >= assignment.assigned_date;
    };

    async function deleteAssignment(assignmentId: string) {
        const { error } = await supabase
            .from('assignments_list')
            .delete()
            .eq('assignment_id', assignmentId);

        if (error) {
            console.error('Deletion failed:', error.message);
        } else {
            setAssignments(prev => prev.filter(a => a.assignment_id !== assignmentId));
        }
    }


    return (
        <div>
            {/* Existing UI structure preserved */}
            <Link href={`/course-selection`}> &lt;- Course Selection </Link>
            <p> -- </p>

            <h1>{course.course_name}</h1>
            <p>Enrollment Code: {course.enrollment_code}</p>
            <p>-----</p>

            <h2>Posted Assignments</h2>
            <p>------------------------------------------</p>

            <ul>
                {assignments.map((assignment) => (
                    <li key={assignment.assignment_id}>
                        <h2>{assignment.assignment_name}</h2>
                        <p>Due Date: {new Date(assignment.due_date).toLocaleDateString()}</p>

                        {/* Open/Close Toggle */}
                        <button
                            onClick={() => setOpenValue(assignment.open, assignment.assignment_id)}
                            title={assignment.open_override ? "Manual override active" : ""}
                        >
                            {assignment.open ? 'OPEN' : 'CLOSED'}
                            {assignment.open_override && " (Manual)"}
                        </button>

                        {/* Assign/Unassign Toggle */}
                        <button
                            onClick={() => setAssignedValue(assignment.assigned, assignment.assignment_id)}
                            disabled={isAutoAssigned(assignment)}
                            title={isAutoAssigned(assignment) ? "Auto-assigned based on schedule" : ""}
                        >
                            {assignment.assigned ? 'ASSIGNED' : 'NOT ASSIGNED'}
                            {isAutoAssigned(assignment) && " (Auto)"}
                        </button>

                        {/* Existing links and buttons */}
                        <Link href={`/assignment-preview/${course_id}/${assignment.assignment_id}`}>
                            View Assignment
                        </Link>
                        <br />
                        <Link href={`/assignment-grade-list/${course_id}/${assignment.assignment_id}`}>
                            View Student Grades
                        </Link>
                        <Link href={`/assignment-editor/${course_id}/${assignment.assignment_id}`}>
                            Edit Assignment
                        </Link>
                        <button
                            onClick={() => deleteAssignment(assignment.assignment_id)}
                        >
                            Delete Assignment
                        </button>
                        <p>------------------------------------------</p>
                    </li>
                ))}
            </ul>
            <Link href={`/assignment-editor/${course_id}`}>Create Assignment</Link>
        </div>
    );
}

export default InstructorDashboardComponent;

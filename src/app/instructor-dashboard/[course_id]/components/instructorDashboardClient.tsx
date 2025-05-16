'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button, Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/react-aria";
import { ChevronLeft, Eye, BarChart2, Pencil, Trash, MoreVertical, Lock, Unlock, Square, CheckSquare } from "lucide-react";
import { logout } from "@/app/actions";
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
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

    // Only add auto-refresh if needed
    useEffect(() => {
        const interval = setInterval(getAssignments, 60000);
        return () => clearInterval(interval);
    }, []);

    async function getAssignments() {
        const { data: retrievedAssignments, error: assignmentError } = await supabase
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

        if (assignmentError) {
            console.error("Problem Retrieving Assignments")
            return null;
        }
        else {
            setAssignments(retrievedAssignments);
        }
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
            {/* Back to Course Selection */}
            <Link href="/course-selection" className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
                <ChevronLeft className="inline" strokeWidth={1} />
                <span className="align-middle group-hover:underline group-focus-visible:underline">Return to Course Selection</span>
            </Link>


            <main className="mx-12 mt-6">

                <div className="mb-4">
                    <p className="text-3xl font-bold">{course.course_name}</p>
                    <p className="text-1xl">Enrollment Code: {course.enrollment_code}</p>
                </div>

                <Link href={`/course-editor/${course_id}`}>
                    <button type="button" className="h-fit border rounded-lg ml-2 px-2 py-1 cursor-pointer bg-lime-50 hover:bg-lime-300 outline-lime-300 focus-visible:outline-2 active:bg-gray-300">
                        Edit Course
                    </button>
                </Link>

                <p className="text-2xl font-semibold my-4" >Posted Assignments</p>

                <Table
                    aria-label="assignments"
                    className="my-6 min-w-md max-w-4xl w-full table-fixed"
                >
                    <TableHeader className="text-left text-sm border-b">
                        <Column isRowHeader className="pl-4 py-2 w-2/8 font-semibold">Assignment</Column>
                        <Column className="w-1/8 font-semibold">Open</Column>
                        <Column className="w-1/8 font-semibold">Assigned</Column>
                        <Column className="w-1/8"> Preview </Column>
                        <Column className="w-1/8"> Grades</Column>
                        <Column className="w-1/8"></Column>
                    </TableHeader>

                    <TableBody>
                        {assignments.map(assignment =>
                            <Row
                                key={assignment.assignment_id}
                                className="group transition-colors hover:bg-lime-50 cursor-pointer focus-within:bg-lime-50 active:bg-lime-300 border-b border-gray-400"
                            >
                                <Cell className="pl-4 py-4">
                                    <h2 className="truncate">{assignment.assignment_name}</h2>
                                </Cell>
                                <Cell>
                                    {/* Open/Close Toggle */}
                                    <button
                                        onClick={() => setOpenValue(assignment.open, assignment.assignment_id)}
                                        title={assignment.open ? "Close Assignment" : "Open Assignment"}
                                        className="row-action bg-transparent p-1 rounded hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-lime-400"
                                    >
                                        {assignment.open
                                            ? <Unlock size={20} />
                                            : <Lock size={20} className={assignment.open_override ? "text-orange-500" : ""} />}
                                    </button>
                                </Cell>
                                <Cell>
                                    <button
                                        onClick={() => setAssignedValue(assignment.assigned, assignment.assignment_id)}
                                        disabled={isAutoAssigned(assignment)}
                                        title={assignment.assigned ? "Unassign" : "Assign"}
                                        className="row-action bg-transparent p-1 rounded hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-lime-400 disabled:opacity-50"
                                        aria-pressed={assignment.assigned}
                                    >
                                        {assignment.assigned
                                            ? <CheckSquare size={20} className="text-green-600" />
                                            : <Square size={20} className="text-gray-400" />}
                                    </button>
                                </Cell>
                                <Cell>
                                    {/* Primary actions as icons */}
                                    <Link href={`/assignment-preview/${course_id}/${assignment.assignment_id}`}>
                                        <button
                                            type="button"
                                            title="Preview"
                                            className="row-action bg-transparent p-1 rounded hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-lime-400"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </Link>
                                </Cell>
                                <Cell>
                                    <Link href={`/assignment-grade-list/${course_id}/${assignment.assignment_id}`}>
                                        <button
                                            type="button"
                                            title="Grades"
                                            className="row-action bg-transparent p-1 rounded hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-lime-400"
                                        >
                                            <BarChart2 size={20} />
                                        </button>
                                    </Link>
                                </Cell>
                                <Cell>
                                    {/* Secondary actions in dropdown */}
                                    <div className="relative row-action">
                                        <button
                                            type="button"
                                            title="More"
                                            className="bg-transparent p-1 rounded hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-lime-400"
                                            onClick={() =>
                                                setDropdownOpen(dropdownOpen === assignment.assignment_id ? null : assignment.assignment_id)
                                            }
                                        >
                                            <MoreVertical size={20} />
                                        </button>
                                        {dropdownOpen === assignment.assignment_id && (
                                            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                                                <Link href={`/assignment-editor/${course_id}/${assignment.assignment_id}`}>
                                                    <button
                                                        type="button"
                                                        title="Edit"
                                                        className="flex items-center w-full px-3 py-2 hover:bg-lime-100"
                                                    >
                                                        <Pencil size={16} className="mr-2" /> Edit
                                                    </button>
                                                </Link>
                                                <button
                                                    className="flex items-center w-full px-3 py-2 hover:bg-red-100 text-red-600"
                                                    onClick={() => deleteAssignment(assignment.assignment_id)}
                                                    title="Delete"
                                                >
                                                    <Trash size={16} className="mr-2" /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </Cell>
                            </Row>
                        )}
                    </TableBody>
                </Table>

                <Link href={`/assignment-editor/${course_id}`}>
                    <button type="button" className="h-fit border rounded-lg ml-2 px-2 py-1 cursor-pointer bg-lime-50 hover:bg-lime-300 outline-lime-300 focus-visible:outline-2 active:bg-gray-300">
                        Create Assignment
                    </button>
                </Link>
            </main>
        </>
    );
}

export default InstructorDashboardComponent;

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from './Modal'

type Question = {
    question_id: number;
    question_body: string[];
    points: number;
    solutions: string[];
    feedback: string[];
};

interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    assignment_id: string | null;
}

const AssignmentCreatorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id }) => {

    // Use the createClient function to initialize a Supabase client
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        getQuestions();
    })

    const [assignmentId, setAssignmentId] = useState(assignment_id);

    // Variables for general assignment data
    const [assignmentName, setAssignmentName] = useState('');
    const [dueDate, setDueDate] = useState(new Date());
    // const [totalPoints, setTotalPoints] = useState(0);
    const totalPoints = 0;
    // Add Functionality for open and close dates
    const [blockCount, setBlockCount] = useState<number>(1);

    useEffect(() => {
        // Initialize selectedIds with empty arrays for each block
        setSelectedIds(Array.from({ length: blockCount }, () => []));
    }, [blockCount]);


    // Variables for block data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[][]>([]);
    //const [blockPoints, setBlockPoints] = useState([0]);

    // State Management
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
    const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(0); // Track which block is being edited

    // Get List of Questions
    async function getQuestions() {
        const { data: retrievedQuestions, error: questionError } = await supabase
            .from('questions')
            .select();

        if (questionError) {
            console.error("Problem retriving questions:", questionError.message);
        }
        else {
            setQuestions(retrievedQuestions);
        }
    }

    // Set General AssignmentData
    async function insertAssignmentDetails() {

        const insertData = {
            assignment_name: assignmentName,
            course_id: course_id,
            assigned: false, // TODO
            open: false, // TODO
            due_date: dueDate,
            total_points: totalPoints,
            block_count: blockCount,
            instructor_id: instructor_id
        };

        const { data: newId, error: assignmentCreateError } = await supabase
            .from('assignments_list')
            .insert([insertData])
            .select('assignment_id')
            .single();

        if (assignmentCreateError) {
            console.error("Problem creating new assignment:", assignmentCreateError.message);
            return null; // Handle the error gracefully
        }
        else {
            alert("Successfully created new assignment entry")
        }

        setAssignmentId(newId.assignment_id);
    }

    // Update General AssignmentData
    async function updateAssignmentDetails() {

        const newData = {
            assignment_name: assignmentName,
            course_id: course_id,
            assigned: false, // TODO
            open: false, // TODO
            due_date: dueDate,
            total_points: totalPoints,
            block_count: blockCount,
            instructor_id: instructor_id
        };

        const { error: assignmentUpdateError } = await supabase
            .from('assignments_list')
            .update([newData])
            .eq('assignment_id', Number(assignmentId));

        if (assignmentUpdateError) {
            console.error("Problem updating assignment details:", assignmentUpdateError.message);
            return null; // Handle the error gracefully
        }
        else {
            alert("Successfully updated assignment details")
        }
    }

    // const openModal = (index: number) => {
    //     getQuestions();
    //     setCurrentBlockIndex(index); // Set the current block index
    //     setIsModalOpen(true);
    // };

    const toggleQuestionSelection = (questionId: number) => {
        setSelectedQuestionIds((prevSelected) =>
            prevSelected.includes(questionId)
                ? prevSelected.filter((id) => id !== questionId) // Unselect if already selected
                : [...prevSelected, questionId] // Add to selected list
        );
    };

    const saveSelectedQuestions = () => {
        setSelectedIds((prev) => {
            const newSelectedIds = [...prev];
            newSelectedIds[currentBlockIndex] = selectedQuestionIds; // Update the specific block's IDs
            return newSelectedIds;
        });
        setIsModalOpen(false);
    };

    async function saveBlocks() {

        for (let i = 1; i <= blockCount; i++) {
            const insertionData = {
                assignment_id: Number(assignmentId),
                block_number: i,
                question_ids: selectedIds[i - 1],
                total_points: 0 //TODO
            }

            console.log(insertionData);

            const { error: insertionError } = await supabase
                .from('question_blocks')
                .insert([insertionData]);

            if (insertionError) {
                console.error("Error creating assignment", insertionError.message);
            }
        }

        const { error: UpdateError } = await supabase
            .from('assignments_list')
            .update({ block_count: blockCount })
            .eq('assignment_id', Number(assignmentId));

        if (UpdateError) {
            console.error("Error updating assignment data", UpdateError.message);
        }
        else {
            router.push(`/instructor-dashboard/${course_id}`);
        }
    };

    return (
        <div>
            <Link href={`/instructor-dashboard/${course_id}`}> Back </Link>
            <h1> Assignment Name: </h1>
            <input
                type="text"
                value={assignmentName}
                onChange={(e) =>
                    setAssignmentName(e.target.value)
                }
            />
            <h2> Due Date: </h2>
            <input
                type="datetime-local"
                onChange={(e) =>
                    setDueDate(new Date(e.target.value))
                }
            />

            {(!assignmentId) &&
                <button onClick={() => { insertAssignmentDetails(); }}>
                    Create New Assignment
                </button>
            }

            {(assignmentId) &&

                <div>

                    <button onClick={() => { updateAssignmentDetails(); }}>
                        Save Assignment Details
                    </button>

                    <h3> Total Points: {totalPoints}</h3>
                    <br></br>
                    <ul>
                        {Array.from({ length: blockCount }).map((_, index) => (
                            <li key={index}>
                                <h1>Question Block {index + 1}</h1>
                                <button onClick={() => {
                                    setIsModalOpen(true);
                                    setCurrentBlockIndex(index); // Set the current block index
                                }}>
                                    Select Questions
                                </button>
                                <Link href={`/question-creator/${course_id}/${assignmentId}`}> Create New Question </Link>

                                {/* Display selected questions for this block */}
                                <div>
                                    {selectedIds[index]?.map((id) => {
                                        const q = questions.find((q) => q.question_id === id);
                                        return (
                                            <div key={id} className="chip">
                                                {q?.question_body.join(', ')}
                                                <button onClick={() => {
                                                    setSelectedIds((prev) => {
                                                        const newSelectedIds = [...prev];
                                                        newSelectedIds[index] = newSelectedIds[index].filter((selectedId) => selectedId !== id);
                                                        return newSelectedIds;
                                                    });
                                                }}>×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button onClick={() => { setBlockCount(blockCount + 1) }}> Add Block </button>
                    <br></br>
                    <button onClick={() => { saveBlocks() }}> Create Assignment </button>
                </div>
            }

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2>Select Questions</h2>
                <ul>
                    {questions.map((question) => (
                        <li key={question.question_id}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.includes(question.question_id)}
                                    onChange={() => toggleQuestionSelection(question.question_id)}
                                />
                                {question.question_body.join(', ')}
                            </label>
                        </li>
                    ))}
                </ul>
                <button onClick={saveSelectedQuestions}>Save Selection</button>
            </Modal>
        </div>
    );
};

export default AssignmentCreatorComponent;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from './Modal';

type Question = {
    question_id: number;
    question_body: string[];
    points: number;
    solutions: string[];
    feedback: string[];
};

type AssignmentDraft = {
    assignment_name: string;
    due_date: Date;
};

interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    assignment_id: string | null;
}

const AssignmentEditorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id }) => {
    const supabase = createClient();
    const router = useRouter();

    const [assignmentId, setAssignmentId] = useState(assignment_id);
    const [assignmentName, setAssignmentName] = useState('');
    const [dueDate, setDueDate] = useState<Date>(new Date());
    const [totalPoints, setTotalPoints] = useState(0);
    const [blockCount, setBlockCount] = useState<number>(1);
    const [threshold, setThreshold] = useState<number[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[][]>([]);
    const [blockPoints, setBlockPoints] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
    const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(0);
    const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>();

    // Fetch questions and assignment draft

    // Fetch questions and assignment draft
    useEffect(() => {
        getQuestions();
        if (assignmentId) {
            getAssignmentDraft();
            getQuestionBlocks();
        }
    }, [assignmentId]);

    useEffect(() => {
        getQuestions();
    }, [assignmentDraft]);

    // Update total points when block points change
    useEffect(() => {
        setTotalPoints(blockPoints.reduce((sum, points) => sum + points, 0));
    }, [blockPoints]);

    // Fetch questions from Supabase
    async function getQuestions() {
        const { data: retrievedQuestions, error } = await supabase.from('questions').select();
        if (error) {
            console.error("Problem retrieving questions:", error.message);
        } else {
            setQuestions(retrievedQuestions || []);
        }
    }

    // Fetch assignment draft details
    async function getAssignmentDraft() {
        const { data: retrievedDraft, error } = await supabase
            .from('assignments_list')
            .select('assignment_name, due_date')
            .eq('assignment_id', assignmentId)
            .single();

        if (error) {
            console.error("Problem retrieving draft:", error.message);
        } else {
            setAssignmentDraft(retrievedDraft);
            setDueDate(retrievedDraft.due_date);
            setAssignmentName(retrievedDraft.assignment_name)

        }
    }

    // Insert new assignment details into Supabase
    async function insertAssignmentDetails() {
        const insertData = {
            assignment_name: assignmentName,
            course_id,
            assigned: false,
            open: false,
            due_date: dueDate,
            total_points: totalPoints,
            block_count: blockCount,
            instructor_id,
        };

        const { data: newId, error } = await supabase
            .from('assignments_list')
            .insert([insertData])
            .select('assignment_id')
            .single();

        if (error) {
            console.error("Problem creating new assignment:", error.message);
        } else {
            alert("Successfully created new assignment entry");
            setAssignmentId(newId.assignment_id);
            router.push(`/assignment-editor/${course_id}/${newId.assignment_id}`)
        }
    }

    // Update existing assignment details in Supabase
    async function updateAssignmentDetails() {
        const updateData = {
            assignment_name: assignmentName,
            course_id,
            assigned: false,
            open: false,
            due_date: dueDate,
            total_points: totalPoints,
            block_count: blockCount,
            instructor_id,
        };

        const { error } = await supabase
            .from('assignments_list')
            .update([updateData])
            .eq('assignment_id', Number(assignmentId));

        if (error) {
            console.error("Problem updating assignment details:", error.message);
        } else {
            alert("Successfully updated assignment details");
            getAssignmentDraft();
        }
    }

    // Save selected questions for a block
    const saveSelectedQuestions = () => {
        setSelectedIds((prev) => {
            const newSelectedIds = [...prev];
            newSelectedIds[currentBlockIndex] = selectedQuestionIds;
            return newSelectedIds;
        });
        setIsModalOpen(false);
    };

    // Save threshold for a block using memoized callback
    const saveBlockThreshold = useCallback((thresholdValue: number, index: number) => {
        setThreshold((prev) => {
            const newThresholds = [...prev];
            newThresholds[index] = thresholdValue;
            return newThresholds;
        });
    }, []);

    const isSaveDisabled = () => {
        return (
            selectedIds.some(block => block.length === 0) ||
            threshold.some(value =>
                isNaN(value) ||
                typeof value !== 'number' ||
                value < 0 ||
                value > (blockPoints[threshold.indexOf(value)] || 0)
            )
        );
    };

    // Update block points when questions change
    useEffect(() => {
        const newBlockPoints = selectedIds.map((block) =>
            block.reduce((sum, id) => {
                const question = questions.find((q) => q.question_id === id);
                return sum + (question?.points || 0);
            }, 0)
        );
        setBlockPoints(newBlockPoints);
    }, [selectedIds, questions]);

    async function getQuestionBlocks() {
        const { data: existingBlocks, error } = await supabase
            .from('question_blocks')
            .select('block_number, question_ids, total_points, mastery_threshold')
            .eq('assignment_id', assignmentId)
            .order('block_number', { ascending: true });

        if (error) {
            console.error("Error fetching blocks:", error.message);
        } else if (existingBlocks) {
            // Set all states directly without relying on useEffect
            setBlockCount(existingBlocks.length);
            setSelectedIds(existingBlocks.map(b => b.question_ids));
            setBlockPoints(existingBlocks.map(b => b.total_points));
            setThreshold(existingBlocks.map(b => b.mastery_threshold));
        }
    }


    // Save blocks into Supabase
    async function saveBlocks() {
        // Update assignment metadata first
        const { error: metaError } = await supabase
            .from('assignments_list')
            .update({ block_count: blockCount })
            .eq('assignment_id', Number(assignmentId));

        if (metaError) {
            console.error("Meta update error:", metaError.message);
            return;
        }

        // Upsert all blocks
        const { error: blockError } = await supabase
            .from('question_blocks')
            .upsert(
                selectedIds.map((_, index) => ({
                    assignment_id: Number(assignmentId),
                    block_number: index + 1,
                    question_ids: selectedIds[index],
                    total_points: blockPoints[index],
                    mastery_threshold: threshold[index]
                })),
                { onConflict: 'assignment_id,block_number' }
            );

        if (blockError) {
            console.error("Block save error:", blockError.message);
        } else {
            alert("Saved successfully");
        }
    }


    async function deleteDraft(id: string) {
        const { error: AssignmentDeletionError } = await supabase
            .from('assignments_list')
            .delete()
            .eq('assignment_id', id)

        if (AssignmentDeletionError) {
            console.error('Problem Deleting Assignment: ', AssignmentDeletionError.message);
            return null;
        }
        else {
            alert("Draft Deleted Successfully");
            router.push(`/instructor-dashboard/${course_id}`)
        }
    }

    const addBlock = () => {
        setBlockCount(prev => prev + 1);
        setSelectedIds(prev => [...prev, []]);
        setThreshold(prev => [...prev, NaN]);
        setBlockPoints(prev => [...prev, 0]);
    };

    const removeBlock = async (blockIndex: number) => {
        const blockNumberToDelete = blockIndex + 1; // Blocks are 1-indexed in the database

        // Delete block from the database
        const { error } = await supabase
            .from('question_blocks')
            .delete()
            .eq('assignment_id', Number(assignmentId))
            .eq('block_number', blockNumberToDelete);

        if (error) {
            console.error("Error deleting block:", error.message);
            alert("Failed to delete block. Please try again.");
            return;
        }

        // Update local state after successful deletion
        setBlockCount((prev) => prev - 1);
        setSelectedIds((prev) => prev.filter((_, index) => index !== blockIndex));
        setBlockPoints((prev) => prev.filter((_, index) => index !== blockIndex));
        setThreshold((prev) => prev.filter((_, index) => index !== blockIndex));

        // Update block numbers for remaining blocks
    const updateBlockNumbers = async () => {
        const { data: remainingBlocks, error } = await supabase
            .from('question_blocks')
            .select('*')
            .eq('assignment_id', Number(assignmentId))
            .order('block_number', { ascending: true });

        if (error) {
            console.error("Error fetching remaining blocks:", error.message);
            return;
        }

        // Update each block's number
        for (let i = 0; i < remainingBlocks.length; i++) {
            const { error: updateError } = await supabase
                .from('question_blocks')
                .update({ block_number: i + 1 })
                .eq('assignment_id', Number(assignmentId))
                .eq('block_number', remainingBlocks[i].block_number);

            if (updateError) {
                console.error("Error updating block numbers:", updateError.message);
                return;
            }
        }
    };

        await updateBlockNumbers();
    };

    function isDateBeforeToday(date: Date) {
        const inputDate = new Date(date);
        const today = new Date();

        // Reset hours, minutes, seconds, and milliseconds to 0 for accurate comparison
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return inputDate < today;
    }

    return (
        <div>
            <Link href={`/instructor-dashboard/${course_id}`}>Back</Link>
            <div>
                <h1>Assignment Name:</h1>
                {assignmentDraft && <p>{assignmentDraft.assignment_name}</p>}
            </div>
            <input type="text" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} />
            <div>
                <h2>Due Date:</h2>
                {assignmentDraft && <p>{new Date(assignmentDraft.due_date).toLocaleString()}</p>}
            </div>
            <input
                type="datetime-local"
                onChange={(e) => setDueDate(new Date(e.target.value))}
            />
            {blockPoints && <h3>Total Points: {totalPoints}</h3>}
            {(!assignmentId
                && assignmentName != ''
                && !isDateBeforeToday(dueDate)) && (
                    <button onClick={insertAssignmentDetails}>Create New Assignment</button>
                )}
            {assignmentId && (
                <div>
                    {(assignmentName != ''
                        && !isDateBeforeToday(dueDate)
                        && (assignmentName != assignmentDraft?.assignment_name
                            || dueDate != assignmentDraft?.due_date)) &&
                        <button onClick={updateAssignmentDetails}>Save Assignment Details</button>
                    }
                    <button onClick={() => deleteDraft(assignmentId)}> Delete Draft </button>
                    <p> --------------------------------------------------------------------------- </p>
                    <ul>
                        {Array.from({ length: blockCount }).map((_, index) => (
                            <li key={index}>
                                <h1>Question Block {index + 1}</h1>
                                <div>
                                    <h3>Mastery Threshold:</h3>
                                    <input
                                        type="number"
                                        value={isNaN(threshold[index]) ? '' : threshold[index]}
                                        onChange={(e) => {
                                            const numValue = Number(e.target.value);
                                            saveBlockThreshold(numValue, index);
                                        }}
                                        min="0"
                                        max={blockPoints[index] || 0}
                                    />

                                </div>
                                <button onClick={() => { setIsModalOpen(true); setCurrentBlockIndex(index); }}>Select Questions</button>
                                <Link href={`/question-creator/${course_id}/${assignmentId}`}>Create New Question</Link>
                                <div>
                                    {/* Zero keeps appearing here */}
                                    {(blockPoints[index] != 0) && <h3>Points for this block: {blockPoints[index]}</h3>}
                                    {selectedIds[index]?.map((id) => {
                                        const q = questions.find((q) => q.question_id === id);
                                        return (
                                            <div key={id} className="chip">
                                                {q?.question_body.join(', ')}
                                                {(q) && <p> {q?.points} Points</p>}
                                                <button onClick={() =>
                                                    setSelectedIds((prev) => prev.map((block, i) =>
                                                        i === index ? block.filter((selectedId) => selectedId !== id) : block))}>×</button>
                                            </div>);
                                    })}
                                </div>
                                <button onClick={() => removeBlock(index)}>Remove Block</button>
                                <p> ----------------------------- </p>
                            </li>
                        ))}
                    </ul>
                    <button onClick={addBlock}>Add Block</button>
                    <br />
                    <button onClick={saveBlocks} disabled={isSaveDisabled()}>Save Assignment</button>
                    {isSaveDisabled() && (
                        <p style={{ color: 'red' }}>
                            Please ensure all blocks have selected questions and thresholds before saving.
                        </p>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2>Select Questions</h2><ul>{questions.map((question) => (
                    <li key={question.question_id}><label><input type="checkbox"
                        checked={selectedQuestionIds.includes(question.question_id)}
                        onChange={() => setSelectedQuestionIds((prev) => (prev.includes(question.question_id) ?
                            prev.filter(id => id !== question.question_id) : [...prev, question.question_id]))} />{question.question_body.join(', ')}</label></li>))}
                </ul><button onClick={saveSelectedQuestions}>Save Selection</button></Modal></div>);
};

export default AssignmentEditorComponent;

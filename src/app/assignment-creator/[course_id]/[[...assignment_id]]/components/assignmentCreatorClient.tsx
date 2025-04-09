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

const AssignmentCreatorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id }) => {
    const supabase = createClient();
    const router = useRouter();

    const [assignmentId, setAssignmentId] = useState(assignment_id);
    const [assignmentName, setAssignmentName] = useState('');
    const [dueDate, setDueDate] = useState(new Date());
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
    useEffect(() => {
        getQuestions();
        if (assignmentId) {
            getAssignmentDraft();
        }
    }, [assignmentId]);

    // Initialize selected IDs when block count changes
    useEffect(() => {
        setSelectedIds(Array.from({ length: blockCount }, () => []));
    }, [blockCount]);

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

    // Save blocks into Supabase
    async function saveBlocks() {
        for (let i = 1; i <= blockCount; i++) {
            const insertionData = {
                assignment_id: Number(assignmentId),
                block_number: i,
                question_ids: selectedIds[i - 1],
                total_points: blockPoints[i - 1],
                mastery_threshold: threshold[i - 1],
            };

            const { error } = await supabase.from('question_blocks').insert([insertionData]);
            if (error) console.error("Error creating question blocks:", error.message);
        }

        const { error } = await supabase.from('assignments_list').update({block_count: blockCount}).eq('assignment_id', Number(assignmentId));
        if (error) console.error("Error updating assignment data:", error.message);
        else router.push(`/instructor-dashboard/${course_id}`);
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
            <input type="datetime-local" onChange={(e) => setDueDate(new Date(e.target.value))} />
            {blockPoints && <h3>Total Points: {totalPoints}</h3>}
            {!assignmentId && (
                <button onClick={insertAssignmentDetails}>Create New Assignment</button>
            )}
            {assignmentId && (
                <div>
                    <button onClick={updateAssignmentDetails}>Save Assignment Details</button>
                    <ul>
                        {Array.from({ length: blockCount }).map((_, index) => (
                            <li key={index}>
                                <h1>Question Block {index + 1}</h1>
                                <div>
                                    <h3>Mastery Threshold:</h3>
                                    <input
                                        type="number"
                                        value={threshold[index]}
                                        onChange={(e) =>
                                            saveBlockThreshold(Number(e.target.value), index)
                                        }
                                        min="0"
                                        max={blockPoints[index] || 0}
                                    />
                                </div>
                                <button onClick={() => { setIsModalOpen(true); setCurrentBlockIndex(index); }}>Select Questions</button>
                                <Link href={`/question-creator/${course_id}/${assignmentId}`}>Create New Question</Link>
                                <div>
                                    {/* Zero keeps appearing here */}
                                    {(blockPoints[index]) && <h3>Points for this block: {blockPoints[index]}</h3>} 
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
                                </div></li>))}
                    </ul><button onClick={() => setBlockCount(blockCount + 1)}>Add Block</button><br />
                    <button onClick={saveBlocks}>Create Assignment</button></div>)}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2>Select Questions</h2><ul>{questions.map((question) => (
                    <li key={question.question_id}><label><input type="checkbox"
                        checked={selectedQuestionIds.includes(question.question_id)}
                        onChange={() => setSelectedQuestionIds((prev) => (prev.includes(question.question_id) ?
                            prev.filter(id => id !== question.question_id) : [...prev, question.question_id]))} />{question.question_body.join(', ')}</label></li>))}
                </ul><button onClick={saveSelectedQuestions}>Save Selection</button></Modal></div>);
};

export default AssignmentCreatorComponent;

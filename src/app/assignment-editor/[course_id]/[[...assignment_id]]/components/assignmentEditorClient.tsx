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
    question_image?: string[];
    image_urls?: string[];
};

type AssignmentDraft = {
    assignment_name: string;
    due_date: Date;
    assigned_date: Date | null;
    open_date: Date | null;
    close_date: Date | null;
};

interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    assignment_id: string | null;
}

const BUCKET_NAME = 'question-images';
const SIGNED_URL_EXPIRY = 60; // seconds

const AssignmentEditorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, assignment_id }) => {
    const supabase = createClient();
    const router = useRouter();

    const [assignmentId, setAssignmentId] = useState(assignment_id);
    const [assignmentName, setAssignmentName] = useState('');
    const [dueDate, setDueDate] = useState<Date>(new Date());
    const [assigned_date, setAssignedDate] = useState<Date | null>(null)
    const [open_date, setOpenDate] = useState<Date | null>(null)
    const [close_date, setCloseDate] = useState<Date | null>(null)
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
    const [searchQuery, setSearchQuery] = useState<string>('');


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

    useEffect(() => {
        setTotalPoints(blockPoints.reduce((sum, points) => sum + points, 0));
    }, [blockPoints]);

    // Fetch questions from Supabase and generate signed URLs for images
    async function getQuestions() {
        const { data: retrievedQuestions, error } = await supabase.from('questions').select();
        if (error) {
            console.error("Problem retrieving questions:", error.message);
        } else {
            // Generate signed URLs for all images in parallel
            const questionsWithSignedUrls: Question[] = await Promise.all(
                (retrievedQuestions || []).map(async (q: Question) => {
                    const image_urls: string[] = [];
                    if (q.question_image && Array.isArray(q.question_image)) {
                        for (const path of q.question_image) {
                            if (path && path.trim() !== '') {
                                const { data } = await supabase
                                    .storage
                                    .from(BUCKET_NAME)
                                    .createSignedUrl(path, SIGNED_URL_EXPIRY);
                                if (data?.signedUrl) {
                                    image_urls.push(data.signedUrl);
                                }
                            }
                        }
                    }
                    return { ...q, image_urls };
                })
            );
            setQuestions(questionsWithSignedUrls);
        }
    }

    async function getAssignmentDraft() {
        const { data: retrievedDraft, error } = await supabase
            .from('assignments_list')
            .select('assignment_name, due_date, assigned_date, open_date, close_date')
            .eq('assignment_id', assignmentId)
            .single();

        if (error) {
            console.error("Problem retrieving draft:", error.message);
        } else {
            setAssignmentDraft(retrievedDraft);
            setDueDate(retrievedDraft.due_date);
            setAssignmentName(retrievedDraft.assignment_name)
            setAssignedDate(retrievedDraft.assigned_date)
            setOpenDate(retrievedDraft.open_date)
            setCloseDate(retrievedDraft.close_date)
        }
    }

    const handleQuestionSelection = (questionId: number) => {
        setSelectedQuestionIds(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

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
            assigned_date: assigned_date,
            open_date: open_date,
            close_date: close_date,
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
            const allQuestionIds = existingBlocks
                .flatMap(b => b.question_ids)
                .filter((v, i, a) => a.indexOf(v) === i);

            const { data: questionsData } = await supabase
                .from('questions')
                .select()
                .in('question_id', allQuestionIds);

            const questionsWithImages = await Promise.all(
                (questionsData || []).map(async (q: Question) => {
                    const image_urls = await Promise.all(
                        (q.question_image || []).map(async (path) => {
                            if (!path) return null;
                            const { data } = await supabase.storage
                                .from(BUCKET_NAME)
                                .createSignedUrl(path, SIGNED_URL_EXPIRY);
                            return data?.signedUrl || null;
                        })
                    );
                    return { ...q, image_urls: image_urls.filter(Boolean) as string[] };
                })
            );

            setQuestions(prev => [
                ...prev.filter(p => !allQuestionIds.includes(p.question_id)),
                ...questionsWithImages
            ]);
            setBlockCount(existingBlocks.length);
            setSelectedIds(existingBlocks.map(b => b.question_ids));
            setBlockPoints(existingBlocks.map(b => b.total_points));
            setThreshold(existingBlocks.map(b => b.mastery_threshold));
        }
    }

    async function saveBlocks() {
        const { error: metaError } = await supabase
            .from('assignments_list')
            .update({ block_count: blockCount })
            .eq('assignment_id', Number(assignmentId));

        if (metaError) {
            console.error("Meta update error:", metaError.message);
            return;
        }

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
        const blockNumberToDelete = blockIndex + 1;

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

        setBlockCount((prev) => prev - 1);
        setSelectedIds((prev) => prev.filter((_, index) => index !== blockIndex));
        setBlockPoints((prev) => prev.filter((_, index) => index !== blockIndex));
        setThreshold((prev) => prev.filter((_, index) => index !== blockIndex));

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
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return inputDate < today;
    }

    const renderModalContent = () => {
        const filteredQuestions = questions.filter((question) =>
            question.question_body.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <>
                <h2>Select Questions</h2>
                <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
                />
                <ul className="question-list">
                    {filteredQuestions.map((question) => (
                        <li key={question.question_id} className="question-item">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.includes(question.question_id)}
                                    onChange={() => handleQuestionSelection(question.question_id)}
                                />
                                <div className="question-preview">
                                    <p>{question.question_body.join(', ')}</p>
                                    <div className="media-previews">
                                        {question.image_urls?.map((url, idx) => (
                                            <img
                                                key={`preview-img-${idx}`}
                                                src={url}
                                                alt={`Preview ${idx + 1}`}
                                                className="media-thumbnail"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </label>
                        </li>
                    ))}
                </ul>
                <button onClick={saveSelectedQuestions}>Save Selection</button>
            </>
        );
    };
    const mediaStyles = `
        .media-preview {
          max-width: 300px;
          max-height: 200px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .media-thumbnail {
          max-width: 100px;
          max-height: 75px;
          margin: 5px;
          object-fit: cover;
          border-radius: 4px;
        }
    `;

    return (
        <div>
            <style jsx>{`${mediaStyles}`}</style>
            <Link href={`/instructor-dashboard/${course_id}`}>Back</Link>
            <div>
                <h1>Assignment Name:</h1>
                {assignmentDraft && <p>{assignmentDraft.assignment_name}</p>}
            </div>
            <input type="text" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} />
            <div>
                <h2>Due Date:</h2>
                {assignmentDraft && <p>{new Date(assignmentDraft.due_date).toString()}</p>}
            </div>
            <input
                type="datetime-local"
                onChange={(e) => setDueDate(new Date(e.target.value))}
            />
            <div>
                <h2>Assigning Date:</h2>
                {assignmentDraft?.assigned_date && <p>{new Date(assignmentDraft.assigned_date).toLocaleString()}</p>}
                <input
                    type="datetime-local"
                    value={assigned_date ? assigned_date.toISOString().slice(0, 16) : ''}
                    onChange={e => setAssignedDate(new Date(e.target.value))}
                />
            </div>

            {(dueDate && assigned_date) &&
                <div>
                    <h2>Opening Date:</h2>
                    {assignmentDraft?.open_date && <p>{new Date(assignmentDraft.open_date).toLocaleString()}</p>}
                    <input
                        type="datetime-local"
                        value={open_date ? open_date.toISOString().slice(0, 16) : ''}
                        onChange={e => setOpenDate(new Date(e.target.value))}
                        min={assigned_date instanceof Date ? assigned_date.toISOString().slice(0, 16) : ''}
                    />
                </div>

            }

            {(dueDate && assigned_date && open_date) &&
                <div>
                    <h2>Closing Date:</h2>
                    {assignmentDraft?.close_date && <p>{new Date(assignmentDraft.close_date).toLocaleString()}</p>}
                    <input
                        type="datetime-local"
                        value={close_date ? close_date.toISOString().slice(0, 16) : ''}
                        onChange={e => setCloseDate(new Date(e.target.value))}
                        min={open_date instanceof Date ? open_date.toISOString().slice(0, 16) : ''}
                    />
                </div>
            }


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
                                    {(blockPoints[index] != 0) && <h3>Points for this block: {blockPoints[index]}</h3>}
                                    {selectedIds[index]?.map((id) => {
                                        const q = questions.find((q) => q.question_id === id);
                                        return (
                                            <div key={id} className="chip">
                                                {q?.question_body.join(', ')}
                                                {q && <p>{q.points} Points</p>}
                                                {q?.image_urls?.map((url, idx) => url && (
                                                    <img
                                                        key={idx}
                                                        src={url}
                                                        alt={`Question ${q.question_id} image ${idx + 1}`}
                                                        style={{
                                                            width: '80px',
                                                            height: '80px',
                                                            objectFit: 'cover',
                                                            borderRadius: '4px'
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ))}
                                                <button onClick={() =>
                                                    setSelectedIds((prev) => prev.map((block, i) =>
                                                        i === index ? block.filter((selectedId) => selectedId !== id) : block))}>
                                                    ×
                                                </button>
                                            </div>
                                        );
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
                {renderModalContent()}
            </Modal>
        </div>
    );
};

export default AssignmentEditorComponent;

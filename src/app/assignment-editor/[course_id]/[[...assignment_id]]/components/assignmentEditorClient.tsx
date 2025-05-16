'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from './Modal';
import { Button } from '@/components/react-aria';
import { logout } from '@/app/actions';

type Question = {
    question_id: number;
    question_body: string[];
    points: number;
    solutions: string[];
    MCQ_options: string[] | null;
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
                <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                    {filteredQuestions.map((question) => {
                        const questionVersions = question.question_body || [];
                        const solutionVersions = question.solutions || [];
                        const isMCQ = question.MCQ_options && question.MCQ_options.length > 0;

                        return (
                            <div key={question.question_id} className="border border-gray-300 rounded-lg p-4 bg-white">
                                <div className="flex items-center mb-3 pb-2 border-b border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestionIds.includes(question.question_id)}
                                        onChange={() => handleQuestionSelection(question.question_id)}
                                        className="accent-lime-500 h-5 w-5 mr-3"
                                    />
                                    <span className="font-semibold text-gray-700">Points: {question.points}</span>
                                </div>

                                <div className="space-y-3">
                                    {[0, 1, 2, 3].map((versionIndex) =>
                                        questionVersions[versionIndex] ? (
                                            <div
                                                key={versionIndex}
                                                className="flex items-start gap-3 border rounded-md bg-gray-50 px-4 py-3 mb-3"
                                            >
                                                <span className="flex-shrink-0 w-7 h-7 bg-lime-200 rounded-full flex items-center justify-center font-semibold text-gray-800 mt-1">
                                                    {versionIndex + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-base font-medium text-gray-800">
                                                            {questionVersions[versionIndex]}
                                                        </div>
                                                        {isMCQ && (
                                                            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                                                                Multiple Choice
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-3">
                                                        <span className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Solution
                                                        </span>
                                                        <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-base text-gray-800 font-semibold shadow-sm">
                                                            {solutionVersions[versionIndex] || (
                                                                <span className="text-gray-400">None</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="sticky bottom-0 left-0 right-0 bg-white pt-4">
                    <button
                        onClick={saveSelectedQuestions}
                        className="w-full bg-lime-300 hover:bg-lime-400 text-gray-900 font-semibold py-2 rounded shadow"
                    >
                        Save Selection
                    </button>
                </div>
            </>
        );
    };

    function toLocalDatetimeString(date: Date) {
        if (!date) return '';
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

            <main className="mx-auto mt-8 max-w-4xl px-4">
                <Link
                    href={`/instructor-dashboard/${course_id}`}
                    className="block w-fit mb-8 text-gray-600 text-sm hover:underline focus-visible:underline outline-none"
                >
                    &lt; Back
                </Link>

                <section className="mb-8">
                    <h1 className="font-mono font-bold text-2xl mb-2">Assignment Name:</h1>
                    <p className="mb-2">{assignmentDraft?.assignment_name}</p>
                    <input
                        type="text"
                        value={assignmentName}
                        onChange={e => setAssignmentName(e.target.value)}
                        className="border rounded px-2 py-1 mb-4 w-full max-w-md"
                    />

                    {/* Due Date */}
                    <div className="mb-4">
                        <span className="font-semibold block mb-1">Due Date:</span>
                        <input
                            type="datetime-local"
                            value={dueDate ? toLocalDatetimeString(dueDate) : ""}
                            onChange={e => setDueDate(new Date(e.target.value))}
                            className="border rounded px-2 py-1 w-full max-w-md"
                        />
                    </div>

                    {/* Assigning Date */}
                    <div className="mb-4">
                        <span className="font-semibold block mb-1">Assigning Date:</span>
                        <input
                            type="datetime-local"
                            value={assigned_date ? toLocalDatetimeString(assigned_date) : ""}
                            onChange={e => setAssignedDate(new Date(e.target.value))}
                            className="border rounded px-2 py-1 w-full max-w-md"
                            max={dueDate ? toLocalDatetimeString(dueDate) : ""}
                        />
                    </div>

                    {/* Conditionally rendered Opening Date */}
                    {dueDate && assigned_date && (
                        <div className="mb-4">
                            <span className="font-semibold block mb-1">Opening Date:</span>
                            <input
                                type="datetime-local"
                                value={open_date ? toLocalDatetimeString(open_date) : ""}
                                onChange={e => setOpenDate(new Date(e.target.value))}
                                className="border rounded px-2 py-1 w-full max-w-md"
                                min={assigned_date ? toLocalDatetimeString(assigned_date) : ""}
                                max={dueDate ? toLocalDatetimeString(dueDate) : ""}
                            />
                        </div>
                    )}

                    {/* Conditionally rendered Closing Date */}
                    {dueDate && assigned_date && open_date && (
                        <div className="mb-4">
                            <span className="font-semibold block mb-1">Closing Date:</span>
                            <input
                                type="datetime-local"
                                value={close_date ? toLocalDatetimeString(close_date) : ""}
                                onChange={e => setCloseDate(new Date(e.target.value))}
                                className="border rounded px-2 py-1 w-full max-w-md"
                                min={open_date ? toLocalDatetimeString(open_date) : ""}
                                max={dueDate ? toLocalDatetimeString(dueDate) : ""}
                            />
                        </div>
                    )}
                </section>

                {blockPoints && (
                    <h3 className="text-lg font-semibold mb-4">
                        Total Points: {totalPoints}
                    </h3>
                )}

                {/* Assignment actions */}
                <div className="mb-8 flex flex-wrap gap-4">
                    {!assignmentId &&
                        assignmentName !== "" &&
                        !isDateBeforeToday(dueDate) && (
                            <button
                                onClick={insertAssignmentDetails}
                                className="bg-lime-300 px-4 py-2 rounded font-semibold hover:bg-lime-400"
                            >
                                Create New Assignment
                            </button>
                        )}
                    {assignmentId && (
                        <>
                            {assignmentName !== "" &&
                                !isDateBeforeToday(dueDate) &&
                                (assignmentName !== assignmentDraft?.assignment_name ||
                                    dueDate !== assignmentDraft?.due_date) && (
                                    <button
                                        onClick={updateAssignmentDetails}
                                        className="bg-lime-300 px-4 py-2 rounded font-semibold hover:bg-lime-400"
                                    >
                                        Save Assignment Details
                                    </button>
                                )}
                            <button
                                onClick={() => deleteDraft(assignmentId)}
                                className="bg-red-200 px-4 py-2 rounded font-semibold hover:bg-red-300"
                            >
                                Delete Draft
                            </button>
                        </>
                    )}
                </div>

                {/* Question Blocks */}
                {assignmentId && (
                    <ul className="space-y-8">
                        {Array.from({ length: blockCount }).map((_, index) => (
                            <li key={index}>
                                <section className="bg-gray-100 rounded-xl p-6">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                                        <h2 className="font-bold text-base mb-2 md:mb-0">
                                            Question Block {index + 1}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">Mastery Threshold:</span>
                                            <input
                                                type="number"
                                                value={isNaN(threshold[index]) ? "" : threshold[index]}
                                                onChange={e => {
                                                    const numValue = Number(e.target.value);
                                                    saveBlockThreshold(numValue, index);
                                                }}
                                                min="0"
                                                max={blockPoints[index] || 0}
                                                className="border rounded px-2 py-1 w-24"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                setIsModalOpen(true);
                                                setCurrentBlockIndex(index);
                                            }}
                                            className="bg-lime-200 px-3 py-1 rounded hover:bg-lime-300"
                                        >
                                            Select Questions
                                        </button>
                                        <Link
                                            href={`/question-creator/${course_id}/${assignmentId}`}
                                            className="bg-lime-200 px-3 py-1 rounded hover:bg-lime-300"
                                        >
                                            Create New Question
                                        </Link>
                                        <button
                                            onClick={() => removeBlock(index)}
                                            className="bg-red-100 px-3 py-1 rounded hover:bg-red-200"
                                        >
                                            Remove Block
                                        </button>
                                    </div>
                                    {blockPoints[index] !== 0 && (
                                        <h3 className="mb-4 font-semibold">
                                            Points for this block: {blockPoints[index]}
                                        </h3>
                                    )}

                                    {/* Questions in this block */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedIds[index]?.map(id => {
                                            const q = questions.find(q => q.question_id === id);
                                            if (!q) return null;
                                            return (
                                                <div
                                                    key={id}
                                                    className="border border-gray-300 rounded-lg bg-white p-4 shadow-sm flex flex-col"
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-base">
                                                            {q.question_body[0]}
                                                        </h4>
                                                        <button
                                                            onClick={() =>
                                                                setSelectedIds(prev =>
                                                                    prev.map((block, i) =>
                                                                        i === index
                                                                            ? block.filter(selectedId => selectedId !== id)
                                                                            : block
                                                                    )
                                                                )
                                                            }
                                                            className="text-red-400 hover:text-red-600 font-bold text-lg"
                                                            title="Remove question"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="mb-2 text-sm text-gray-700">
                                                        <span className="font-semibold">Points:</span> {q.points}
                                                    </div>
                                                    {q.image_urls && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {q.image_urls.map(
                                                                (url, idx) =>
                                                                    url && (
                                                                        <img
                                                                            key={idx}
                                                                            src={url}
                                                                            alt={`Question ${q.question_id} image ${idx + 1}`}
                                                                            className="w-24 h-24 object-cover rounded"
                                                                            onError={e => {
                                                                                (e.currentTarget as HTMLImageElement).style.display =
                                                                                    "none";
                                                                            }}
                                                                        />
                                                                    )
                                                            )}
                                                        </div>
                                                    )}
                                                    {q.solutions?.length > 0 && (
                                                        <div className="mb-2 text-sm">
                                                            <span className="font-semibold">Solution:</span>{" "}
                                                            {q.solutions.join(", ")}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-8 flex flex-wrap gap-4">
                    <button
                        onClick={addBlock}
                        className="bg-lime-200 px-4 py-2 rounded font-semibold hover:bg-lime-300"
                    >
                        Add Block
                    </button>
                    <button
                        onClick={saveBlocks}
                        disabled={isSaveDisabled()}
                        className={`px-4 py-2 rounded font-semibold ${isSaveDisabled()
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-lime-300 hover:bg-lime-400"
                            }`}
                    >
                        Save Assignment
                    </button>
                </div>
                {isSaveDisabled() && (
                    <p className="mt-2 text-red-500">
                        Please ensure all blocks have selected questions and thresholds before saving.
                    </p>
                )}

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Select Questions">
                    {renderModalContent()}
                </Modal>
            </main>
        </>
    );

};

export default AssignmentEditorComponent;

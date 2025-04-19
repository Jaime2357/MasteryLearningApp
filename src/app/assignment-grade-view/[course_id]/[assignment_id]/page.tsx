import React from 'react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type AssignmentParams = { course_id: string, assignment_id: string };

interface Question {
    question_id: string;
    question_body: string[];
    points: number;
    solutions: string[];
    question_image?: string[]; // Added image paths
}

interface SubmittedQuestion {
    questionText: string;
    submittedAnswer: string | null;
    correctAnswer: string | null;
    grade: number | null;
    pointsPossible: number;
    image?: string; // Single image per question version
}

interface Version {
    version: number;
    questions: SubmittedQuestion[];
}

// interface BlockSubmission {
//   block_id: string;
//   block_version: number;
//   answers: string[]; // Array of submitted answers
//   grade: number[]; // Array of grades for each question
// }

interface Block {
    blockNumber: number;
    versions: Version[];
}

interface StructuredData {
    blocks: Block[];
}

// interface SubmissionData {
//   blocks_complete: boolean[];
//   block_scores: number[];
// }

// interface AssignmentData {
//   assignment_name: string;
//   due_date: string;
//   total_points: number;
// }

export default async function AssignmentResultPage({ params }: { params: AssignmentParams }) {
    const supabase = await createClient();

    // Authenticate user
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
        return null; // Prevent further execution
    }

    // Get student ID
    const { data: studentId } = await supabase.from('students').select('student_id').eq('system_id', userData.user.id).single();
    if (!studentId) {
        return (
            <div>
                <p> UH OH </p>
            </div>
        );
    }

    const { course_id, assignment_id } = await params;

    // Fetch general submission data
    const { data: submissionData } = await supabase
        .from("student_submissions")
        .select("blocks_complete, block_scores")
        .eq('assignment_id', assignment_id)
        .eq('student_id', studentId.student_id)
        .single();

    if (!submissionData) {
        return <div> Error Retrieving Submission Data </div>;
    }

    // Fetch general assignment data
    const { data: assignmentData } = await supabase
        .from("assignments_list")
        .select('assignment_name, due_date, total_points')
        .eq('assignment_id', assignment_id)
        .single();

    if (!assignmentData) {
        return <div> Error Retrieving Assignment Data </div>;
    }

    // Fetch question block data
    const { data: blocks } = await supabase
        .from("question_blocks")
        .select('block_id, block_number, question_ids')
        .eq('assignment_id', assignment_id);

    if (!blocks) {
        return <div> Error Retrieving Question Blocks </div>;
    }

    const blockIds = blocks.map(block => block.block_id);
    const questionIds = blocks.reduce((acc, block) => acc.concat(block.question_ids), []);

    // Fetch questions
    const { data: questions } = await supabase
        .from("questions")
        .select('question_id, question_body, points, solutions, question_image')
        .in('question_id', questionIds);

    // Generate signed URLs for images
    const BUCKET_NAME = 'question-images'; // Replace with your bucket name
    const SIGNED_URL_EXPIRY = 600; // 10 minutes

    const questionsWithImages = await Promise.all(
        (questions || []).map(async (question) => {
            const image_urls: string[] = [];
            if (question.question_image && Array.isArray(question.question_image)) {
                for (const path of question.question_image) {
                    if (path?.trim()) {
                        const { data } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);
                        if (data?.signedUrl) {
                            image_urls.push(data.signedUrl);
                        }
                    }
                }
            }
            return { ...question, image_urls };
        })
    );

    // Fetch block submissions
    const { data: blockSubmissions } = await supabase
        .from("block_submissions")
        .select('block_id, block_version, answers, grade')
        .in('block_id', blockIds);

    if (!blockSubmissions) {
        return <div> Error Retrieving Block Submission Data </div>;
    }

    // Create a structured data object for rendering
    const structuredData: StructuredData = {
        blocks: blocks.map((block) => {
            const blockSubmissionVersions = blockSubmissions.filter((submission) => submission.block_id === block.block_id);
            const blockQuestions = questionsWithImages.filter((question) => block.question_ids.includes(question.question_id));

            const versions: Version[] = Array.from({ length: Math.max(...blockSubmissionVersions.map(s => s.block_version)) + 1 }, (_, versionIndex) => {
                const versionSubmissions = blockSubmissions.find((submission) => submission.block_version === versionIndex);

                if (!versionSubmissions) return { version: versionIndex + 1, questions: [] };

                const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question, questionIndex) => ({
                    questionText: question.question_body[versionIndex] ?? "Unknown Question",
                    submittedAnswer: versionSubmissions.answers[questionIndex] ?? "Not Submitted",
                    correctAnswer: question.solutions[versionIndex] ?? "Unknown",
                    grade: versionSubmissions.grade[questionIndex] ?? null,
                    pointsPossible: question.points,
                    image: question.image_urls[versionIndex] // Get version-specific image
                }));

                return {
                    version: versionIndex + 1,
                    questions: versionQuestions,
                };
            });

            return {
                blockNumber: block.block_number,
                versions,
            };
        }),
    };

    let totalScore

    if (assignmentData.total_points <= 0) {
        totalScore = 100
    }
    else {
        totalScore = parseFloat(((submissionData.block_scores.reduce((acc: number, curr: number) => acc + curr, 0)) / assignmentData.total_points * 100).toFixed(2));

    }

    const currentDate: Date = new Date();
    const dueDate: Date = new Date(assignmentData.due_date);

    const milliDif = Math.abs(dueDate.getTime() - currentDate.getTime());

    const daysLeft: number = Math.floor(milliDif / (1000 * 60 * 60 * 24))


    return (
        <div>
            <div>
                <Link href={`/student-dashboard/${course_id}`}> Back </Link>
            </div>
            <h2>{assignmentData.assignment_name}</h2>
            <h3> Grade: {totalScore}% </h3>
            <p>Due Date: {assignmentData.due_date}</p>

            {
                (daysLeft < 1) && <p> Less than 1 day left to submit</p>
            }

            {
                (daysLeft > 0) && <p> {daysLeft} days left to submit</p>
            }

            {structuredData.blocks.map((block) => (
                <div key={block.blockNumber}>
                    <h3>Question Block {block.blockNumber}:</h3>
                    {block.versions.map((version) => (
                        <div key={version.version}>
                            <h4>Version {version.version}:</h4>
                            {version.questions.map((question, index) => (
                                <div key={index}>
                                    {question.image && (
                                        <div style={{ margin: '10px 0' }}>
                                            <img
                                                src={question.image}
                                                alt={`Question ${index + 1} visual aid`}
                                                style={{
                                                    maxWidth: '200px',
                                                    maxHeight: '200px',
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <p>Question {index + 1}: {question.questionText}</p>
                                    <p>- Submitted Answer: {question.submittedAnswer}</p>
                                    <p>- Correct Answer: {question.correctAnswer}</p>
                                    <p>-- Grade/Points Possible: {question.grade ?? "0"}/{question.pointsPossible}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}





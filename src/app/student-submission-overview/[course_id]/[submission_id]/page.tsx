import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type AssignmentParams = { course_id: string, submission_id: number };

interface SubmittedQuestion {
    questionText: string;
    submittedAnswer: string | null;
    correctAnswer: string | null;
    grade: number | null;
    pointsPossible: number;
    image?: string; // Added image field
    FRQ_err_marg?: number;
}

interface Version {
    version: number;
    questions: SubmittedQuestion[];
}

interface Block {
    blockNumber: number;
    versions: Version[];
}

interface StructuredData {
    blocks: Block[];
}

export default async function SubmissionReviewPage({ params }: { params: AssignmentParams }) {

    // Create Supabase connection
    const supabase = await createClient();
    const { course_id, submission_id } = await params;

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
        return null; // Prevent further execution
    }

    // Fetch general submission data
    const { data: submissionData } = await supabase
        .from("student_submissions")
        .select("student_id, assignment_id, blocks_complete, block_scores")
        .eq('submission_id', submission_id)
        .single();

    if (!submissionData) {
        return <div> Error Retrieving General Submission Data </div>;
    }

    // Fetch student name
    const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq('student_id', submissionData.student_id)
        .single();

    if (!student) {
        return <div> Error Retrieving Student Data </div>;
    }

    // Fetch general assignment data
    const { data: assignmentData } = await supabase
        .from("assignments_list")
        .select('assignment_name, due_date, total_points')
        .eq('assignment_id', submissionData.assignment_id)
        .single();

    if (!assignmentData) {
        return <div> Error Retrieving Assignment Data </div>;
    }

    // Fetch question block data
    const { data: blocks } = await supabase
        .from("question_blocks")
        .select('block_id, block_number, question_ids')
        .eq('assignment_id', submissionData.assignment_id);

    if (!blocks) {
        return <div> Error Retrieving Question Blocks </div>;
    }

    const questionIds = blocks.reduce((acc, block) => acc.concat(block.question_ids), []);

    // Fetch questions
    const { data: questions } = await supabase
        .from("questions")
        .select('question_id, question_body, points, solutions, question_image, MCQ_options, FRQ_err_marg')
        .in('question_id', questionIds);


    // Generate signed URLs for images
    const BUCKET_NAME = 'question-images';
    const SIGNED_URL_EXPIRY = 600; // 10 minutes

    const questionsWithImages = await Promise.all(
        (questions || []).map(async (question) => {
            const image_urls: (string | null)[] = [];
            if (question.question_image && Array.isArray(question.question_image)) {
                for (const path of question.question_image) {
                    if (path?.trim()) {
                        const { data, error } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);
                        image_urls.push(error ? null : data?.signedUrl || null);
                    } else {
                        image_urls.push(null);
                    }
                }
            }
            return { ...question, image_urls, MCQ_options: question.MCQ_options };
        })
    );

    // Fetch block submissions
    const { data: blockSubmissions } = await supabase
        .from("block_submissions")
        .select('block_id, block_version, answers, grade')
        .eq('submission_id', submission_id);

    if (!blockSubmissions) {
        return <div> Error Retrieving Block Submission Data </div>;
    }

    // Create a structured data object for rendering
    const structuredData: StructuredData = {
        blocks: blocks.map((block) => {
            const blockSubmissionVersions = blockSubmissions.filter((submission) => submission.block_id === block.block_id);
            const blockQuestions = questionsWithImages.filter((question) => block.question_ids.includes(question.question_id));

            const versions: Version[] = Array.from({ length: Math.max(...blockSubmissionVersions.map(s => s.block_version)) + 1 }, (_, versionIndex) => {
                const versionSubmissions = blockSubmissionVersions.find((submission) => submission.block_version === versionIndex);

                if (!versionSubmissions) return { version: versionIndex + 1, questions: [] };

                const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question, questionIndex) => {
                    // Get MCQ options for this version, filter out empty ones
                    const mcqOptionsRaw = question.MCQ_options?.[versionIndex] ?? [];
                    const mcqOptions = mcqOptionsRaw.filter((opt: string | undefined) => opt?.trim() !== '');
                    const isMCQ = mcqOptions.length >= 2;

                    // Find the submitted answer (index or text)
                    const submitted = versionSubmissions.answers[questionIndex] ?? "Not Submitted";
                    let submittedAnswer = submitted;
                    let correctAnswer = question.solutions[versionIndex] ?? "Unknown";

                    // Map MCQ indices to option text
                    if (isMCQ) {
                        // Submitted answer mapping
                        if (!isNaN(Number(submitted)) && mcqOptionsRaw[Number(submitted)] !== undefined) {
                            submittedAnswer = `${String.fromCharCode(65 + Number(submitted))}. ${mcqOptionsRaw[Number(submitted)]}`;
                        }
                        // Correct answer mapping
                        if (!isNaN(Number(correctAnswer)) && mcqOptionsRaw[Number(correctAnswer)] !== undefined) {
                            correctAnswer = `${String.fromCharCode(65 + Number(correctAnswer))}. ${mcqOptionsRaw[Number(correctAnswer)]}`;
                        }
                    }

                    return {
                        questionText: question.question_body[versionIndex] ?? "Unknown Question",
                        submittedAnswer,
                        correctAnswer,
                        grade: versionSubmissions.grade[questionIndex] ?? null,
                        pointsPossible: question.points,
                        image: question.image_urls[versionIndex] || undefined,
                        FRQ_err_marg: question.FRQ_err_marg?.[versionIndex] || 0.0
                    };
                });


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

    let blockScores = submissionData.block_scores;
    if (!blockScores) {
        blockScores = [0];
    }

    let totalScore

    if (assignmentData.total_points === 0) {
        totalScore = 100
    }
    else {
        totalScore = parseFloat(((blockScores.reduce((acc: number, curr: number) => acc + curr, 0)) / assignmentData.total_points * 100).toFixed(2));

    }

    const currentDate: Date = new Date();
    const dueDate: Date = new Date(assignmentData.due_date);

    const milliDif = Math.abs(dueDate.getTime() - currentDate.getTime());

    const daysLeft: number = Math.floor(milliDif / (1000 * 60 * 60 * 24))

    return (
        <div>
            <div>
                <Link href={`/assignment-grade-list/${course_id}/${submissionData.assignment_id}`}> Back </Link>
            </div>
            <h1>{assignmentData.assignment_name}</h1>
            <h2> Student: {student.first_name} {student.last_name}</h2>
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
                                        <div style={{
                                            margin: '10px 0',
                                            maxWidth: '300px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            padding: '4px'
                                        }}>
                                            <img
                                                src={question.image}
                                                alt={`Question ${index + 1} visual aid`}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <p>Question {index + 1}: {question.questionText}</p>
                                    <p>Submitted Answer: {question.submittedAnswer}</p>
                                    <p>Margin of Error Allowed: {question.FRQ_err_marg}</p>
                                    <p>Correct Answer: {question.correctAnswer}</p>
                                    <p>Grade: {question.grade ?? "0"}/{question.pointsPossible}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}





import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

type AssignmentParams = { course_id: string, assignment_id: number };

interface PageProps {
  params: Promise<AssignmentParams>
}

interface SubmittedQuestion {
    questionText: string;
    correctAnswer: string | null;
    pointsPossible: number;
    questionFeedback: string | null;
    image: string;
    feedbackImage: string;
    feedbackVideo: string;
    MCQOptions?: string[];
    isMCQ?: boolean;
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

interface DBQuestion {
    question_id: number;
    question_body: string[];
    points: number;
    solutions: string[];
    feedback: string[];
    question_image?: string[];
    feedback_images?: string[];
    feedback_videos?: string[];
    MCQ_options?: string[][];
    FRQ_err_marg?: number[];
}

interface DBBlock {
    block_id: number;
    block_number: number;
    question_ids: number[];
    created_at?: string;
}

const FeedbackMedia: React.FC<{ video?: string }> = ({ video }) => {
    if (!video) return null;

    const isYouTube = video.includes('youtube.com') || video.includes('youtu.be');
    const getYouTubeId = (url: string) => {
        const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        return match ? match[1] : null;
    };

    return isYouTube ? (
        <div className={`w-full aspect-video mt-3 mb-1`}>
            <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(video)}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded"
            />
        </div>
    ) : (
        <video
            controls
            className="w-full aspect-video mt-3 mb-1 rounded"
            style={{ maxWidth: '100%', height: 'auto' }}
        >
            <source src={video} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    );
};

export default async function AssignmentPreviewPage({ params }: PageProps) {
    const supabase = await createClient();
    const { course_id, assignment_id } = await params;

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
        redirect('/login');
        return null;
    }

    const { data: instructorID, error: notInstructor } = await supabase
        .from("instructors")
        .select("instructor_id");
    if (notInstructor || !instructorID) {
        return <div> Access Denied </div>;
    }

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
        .eq('assignment_id', assignment_id) as { data: DBBlock[] | null };
    if (!blocks) {
        return <div> Error Retrieving Question Blocks </div>;
    }

    const questionIds = blocks.reduce((acc: number[], block: DBBlock) => acc.concat(block.question_ids), []);

    // Fetch questions
    const { data: questions } = await supabase
        .from("questions")
        .select()
        .in('question_id', questionIds) as { data: DBQuestion[] | null };
    if (!questions) {
        return <div> Error Retrieving Questions </div>;
    }

    // Generate signed URLs for private bucket images
    const SIGNED_URL_EXPIRY = 60 * 10; // 10 minutes
    const BUCKET_NAME = 'question-images';

    // For each question, generate signed URLs for all images
    const questionsWithImages = await Promise.all(
        (questions as DBQuestion[]).map(async (question) => {
            const question_image_urls = Array(4).fill('');
            if (question.question_image) {
                await Promise.all(question.question_image.map(async (path, index) => {
                    if (path?.trim()) {
                        const { data } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);
                        if (data?.signedUrl) {
                            question_image_urls[index] = data.signedUrl;
                        }
                    }
                }));
            }

            const feedback_image_urls = Array(4).fill('');
            if (question.feedback_images) {
                await Promise.all(question.feedback_images.map(async (path, index) => {
                    if (path?.trim()) {
                        const { data } = await supabase.storage
                            .from(BUCKET_NAME)
                            .createSignedUrl(path, SIGNED_URL_EXPIRY);
                        if (data?.signedUrl) {
                            feedback_image_urls[index] = data.signedUrl;
                        }
                    }
                }));
            }

            return {
                ...question,
                question_image_urls,
                feedback_image_urls,
                feedback_videos: question.feedback_videos || []
            };
        })
    );

    // Create a structured data object for rendering
    const structuredData: StructuredData = {
        blocks: blocks.map((block: DBBlock) => {
            const blockQuestions = questionsWithImages.filter((question) =>
                block.question_ids.includes(question.question_id)
            );

            const versions: Version[] = Array.from({ length: 4 }, (_, versionIndex) => {
                const versionQuestions: SubmittedQuestion[] = blockQuestions.map((question) => {
                    // Check if MCQ_options exists at all before trying to access it
                    const hasMCQOptions = Array.isArray(question.MCQ_options) && question.MCQ_options.length > 0;

                    // Get raw options if they exist for this version
                    const MCQOptionsRaw = hasMCQOptions && question.MCQ_options?.[versionIndex]
                        ? question.MCQ_options[versionIndex]
                        : [];

                    // Filter non-empty options
                    const MCQOptions = MCQOptionsRaw.filter(opt => opt && opt.trim() !== '');

                    // More lenient MCQ detection
                    const isMCQ = MCQOptions.length >= 2;

                    // Map solution index to text (with better error handling)
                    let correctAnswer = question.solutions?.[versionIndex] ?? "Unknown";
                    if (isMCQ && correctAnswer !== "Unknown") {
                        const idx = Number(correctAnswer);
                        if (!isNaN(idx) && MCQOptionsRaw[idx]?.trim()) {
                            correctAnswer = `${String.fromCharCode(65 + idx)}. ${MCQOptionsRaw[idx]}`;
                        } else {
                            correctAnswer = '[No valid option selected]';
                        }
                    }

                    return {
                        questionText: question.question_body?.[versionIndex] ?? "Unknown Question",
                        correctAnswer,
                        pointsPossible: question.points,
                        questionFeedback: question.feedback?.[versionIndex] ?? "N/A",
                        image: question.question_image_urls?.[versionIndex] || '',
                        feedbackImage: question.feedback_image_urls?.[versionIndex] || '',
                        feedbackVideo: question.feedback_videos?.[versionIndex] || '',
                        MCQOptions,
                        isMCQ,
                        FRQ_err_marg: question.FRQ_err_marg?.[versionIndex] || 0.0,
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

    console.log(structuredData)

    return (
        <>

            {/* Navbar */}
            <header className="px-8 pt-6 pb-4 border-b bg-lime-300">
                <nav className="grid grid-cols-4">
                    <h1 className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">
                        {assignmentData.assignment_name}
                    </h1>
                </nav>
            </header>

            <main className="mx-12 mt-6 max-w-4xl lg:mx-auto">

                <Link href={`/instructor-dashboard/${course_id}`} className="block w-fit mt-6 outline-none text-gray-600 group">
                    <ChevronLeft className="inline" strokeWidth={1} />
                    <span className="align-middle group-hover:underline group-focus-visible:underline">Back</span>
                </Link>

                <p className="mt-4 ml-4 text-lg font-semibold">Due Date: <span className="font-normal">
                        {new Date(assignmentData.due_date).toLocaleString('en-US', {
                            month: 'long',   // "May"
                            day: 'numeric',  // "5"
                            year: 'numeric', // "2025"
                            hour: 'numeric', // "11"
                            minute: '2-digit', // "59"
                            hour12: true     // "PM"
                        })}
                    </span>
                </p>

                {structuredData.blocks.map((block) => (
                    <section
                        key={block.blockNumber}
                        className="mt-8 p-6 bg-gray-200 rounded-xl font-mono max-w-5xl mx-auto"
                    >
                        <header className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Set {block.blockNumber}:</h3>
                            {/* Optionally add set score/total here */}
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-4 md:grid-rows-2 gap-6">
                            {block.versions.map((version) => (
                                <article
                                    key={version.version}
                                    className="bg-white rounded shadow p-4 flex flex-col min-h-[300px]"
                                >
                                    <h4 className="font-bold mb-2">Version {version.version}</h4>
                                    {version.questions.map((question, index) => (
                                        <div
                                            key={index}
                                            className="mb-4 border border-gray-300 rounded-lg bg-gray-50 p-3 shadow-sm"
                                        >
                                            <div className="mb-1">
                                                <span className="font-semibold">Question {index + 1}:</span> {question.questionText}
                                            </div>
                                            {question.isMCQ && question.MCQOptions && (
                                                <div className="mb-1">
                                                    <span className="font-semibold">Options:</span>
                                                    <ul className="list-disc list-inside ml-2">
                                                        {question.MCQOptions?.map((opt, optIdx) => (
                                                            <li key={optIdx}>
                                                                <span className="font-semibold">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <div className="mb-1">
                                                <span className="font-semibold">Correct Answer:</span>{" "}
                                                <span>
                                                    {question.correctAnswer}
                                                    {question.FRQ_err_marg !== 0 && (
                                                        <span>&nbsp;± {question.FRQ_err_marg}</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="mb-1">
                                                <span className="font-semibold">Points:</span> {question.pointsPossible}
                                            </div>
                                            {/* Feedback text and image together */}
                                            <div className="mb-1 flex items-start gap-2">
                                                <span className="font-semibold">Feedback:</span>
                                                <span>
                                                    {question.questionFeedback || <span className="text-gray-400">N/A</span>}
                                                    {question.feedbackImage && (
                                                        <img
                                                            src={question.feedbackImage}
                                                            alt="Feedback"
                                                            className="inline-block w-12 h-12 object-contain rounded ml-2 align-middle"
                                                        />
                                                    )}
                                                </span>
                                            </div>
                                            {/* Feedback video below, always responsive */}
                                            {question.feedbackVideo && (
                                                <FeedbackMedia video={question.feedbackVideo} />
                                            )}
                                        </div>
                                    ))}

                                </article>
                            ))}
                        </div>
                    </section >
                ))
                }



            </main >
        </>
    );
}

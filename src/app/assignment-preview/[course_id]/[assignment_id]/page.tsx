import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type AssignmentParams = { course_id: string, assignment_id: number };

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
}

interface DBBlock {
    block_id: number;
    block_number: number;
    question_ids: number[];
    created_at?: string;
}

const FeedbackMedia = ({ image, video }: { image?: string; video?: string }) => {
    if (!image && !video) return null;

    const isYouTube = video?.includes('youtube.com') || video?.includes('youtu.be');
    const getYouTubeId = (url: string) => {
        const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        return match ? match[1] : null;
    };

    return (
        <div className="feedback-media">
            {image && (
                <img
                    src={image}
                    alt="Feedback visual aid"
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }}
                />
            )}
            {video && (
                isYouTube ? (
                    <div className="video-responsive">
                        <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeId(video)}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <video controls style={{ maxWidth: '100%', height: 'auto' }}>
                        <source src={video} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                )
            )}
        </div>
    );
};

export default async function AssignmentPreviewPage({ params }: { params: AssignmentParams }) {
    const supabase = await createClient();
    const { course_id, assignment_id } = params;

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

                    // Debug - log what we're finding
                    console.log('Question ID:', question.question_id);
                    console.log('Has MCQ options:', hasMCQOptions);
                    console.log('MCQ options for version:', MCQOptionsRaw);
                    console.log('Filtered options:', MCQOptions);
                    console.log('Is MCQ?', MCQOptions.length >= 2);

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

    return (
        <div>
            <div>
                <Link href={`/instructor-dashboard/${course_id}`}> Back </Link>
            </div>
            <h1>{assignmentData.assignment_name}</h1>
            <p>Due Date: {assignmentData.due_date}</p>

            {structuredData.blocks.map((block) => (
                <div key={block.blockNumber}>
                    <h3>Question Block {block.blockNumber}:</h3>
                    {block.versions.map((version) => (
                        <div key={version.version}>
                            <h4>Version {version.version}:</h4>
                            {version.questions.map((question, index) => (
                                <div key={index}>
                                    <p>Question {index + 1}: {question.questionText}</p>
                                    {question.image && (
                                        <img
                                            src={question.image}
                                            alt={`Question visual aid`}
                                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                        />
                                    )}

                                    {question.isMCQ && question.MCQOptions && question.MCQOptions.length > 0 && (
                                        <div>
                                            <b>Options:</b>
                                            <ul>
                                                {question.MCQOptions.map((opt, optIdx) => (
                                                    <li key={optIdx}>
                                                        {String.fromCharCode(65 + optIdx)}. {opt}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p>
                                        <b>Correct Answer:</b> {question.correctAnswer}
                                    </p>
                                    <p>Points: {question.pointsPossible}</p>
                                    <p>Feedback: {question.questionFeedback}</p>

                                    {(question.feedbackImage || question.feedbackVideo) && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <h5>Feedback Media:</h5>
                                            <FeedbackMedia
                                                image={question.feedbackImage}
                                                video={question.feedbackVideo}
                                            />
                                        </div>
                                    )}
                                    <p>-----</p>
                                </div>
                            ))}
                            <p> ----------------------------------------</p>
                        </div>
                    ))}
                    <hr />
                </div>
            ))}
        </div>
    );
}
